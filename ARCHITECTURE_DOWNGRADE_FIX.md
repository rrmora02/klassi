# Architecture Design Document: Multi-School Enterprise→PRO Downgrade Fix

**Document Version:** 1.0  
**Date:** 2026-06-14  
**Status:** Draft  
**Reviewer:** Engineering Team

---

## Executive Summary

The critical bug in Klassi's multi-school downgrade flow allows child tenants to bypass plan limits when a parent ENTERPRISE tenant downgrades to PRO. This occurs because child tenants retain their ENTERPRISE plan designation while the parent's downgrade is only tracked in `pendingPlan`. The fix implements **child tenant plan inheritance** with **real-time validation enforcement** at the API layer, ensuring child tenants respect the effective plan limits of their parent tenant at all times—both during and after downgrade periods.

---

## 1. Data Model Changes

### 1.1 Tenant Schema Extensions

Add two new columns to the `Tenant` model to track child plan enforcement state:

```prisma
model Tenant {
  id               String           @id @default(cuid())
  name             String
  slug             String           @unique
  // ... existing fields ...
  
  plan             SubscriptionPlan @default(STARTER)
  pendingPlan      SubscriptionPlan?
  pendingPlanAt    DateTime?
  
  // NEW: Plan inheritance & enforcement
  parentTenantId   String?
  isInheritedPlan  Boolean          @default(false)  // true = child uses parent's effective plan
  inheritedAt      DateTime?        // when parent sync occurred
  
  parentTenant     Tenant?          @relation("TenantChildren", fields: [parentTenantId], references: [id])
  childTenants     Tenant[]         @relation("TenantChildren")
  
  // ... rest of model ...
}
```

**Rationale:**
- `isInheritedPlan`: Boolean flag indicating this child ignores its own `plan` column and uses parent's effective plan instead
- `inheritedAt`: Audit trail for when plan inheritance was activated (needed for rollback scenarios)
- These fields are minimal and reuse existing parent-child relationship structure

### 1.2 Index Changes

Add covering index for parent-child plan lookups (performance optimization):

```prisma
@@index([parentTenantId, isInheritedPlan, id])
```

This enables fast queries to find all child tenants under a parent and filter by inheritance state.

**Migration SQL:**
```sql
ALTER TABLE "Tenant" 
  ADD COLUMN "isInheritedPlan" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inheritedAt" TIMESTAMP NULL;

CREATE INDEX "Tenant_parentTenantId_isInheritedPlan_id_idx" 
  ON "Tenant" ("parentTenantId", "isInheritedPlan", "id");
```

---

## 2. Subscription Lifecycle Management

### 2.1 Webhook Change: Plan Inheritance on Downgrade

When `customer.subscription.updated` fires for a downgrade:

**Current behavior (lines 138-169 in stripe/route.ts):**
- Parent tenant only: sets `pendingPlan` and `pendingPlanAt`
- Children remain unchanged (BUG)

**New behavior:**

```typescript
case "customer.subscription.updated": {
  const sub = event.data.object as Stripe.Subscription;
  const tenant = await db.tenant.findFirst({ 
    where: { stripeSubId: sub.id },
    include: { childTenants: true }  // NEW
  });
  if (!tenant) break;

  const newPlan = PRICE_PLAN_MAP[sub.items.data[0]?.price.id ?? ""];
  if (!newPlan || newPlan === tenant.plan) break;

  const adminEmail = await getTenantAdminEmail(tenant.id);

  if (isDowngrade(tenant.plan, newPlan)) {
    // 1. Set parent's pendingPlan
    const effectiveDate = new Date(sub.current_period_end * 1000);
    await db.tenant.update({
      where: { id: tenant.id },
      data: { pendingPlan: newPlan, pendingPlanAt: effectiveDate },
    });

    // 2. NEW: Sync ALL children to use parent's effective plan (now: newPlan)
    //    This makes the downgrade effect immediate for child limits
    await db.tenant.updateMany({
      where: { parentTenantId: tenant.id },
      data: { 
        isInheritedPlan: true,
        inheritedAt: new Date(),
        // Note: child.plan remains unchanged; effective plan comes from parent
      },
    });

    // Send notifications
    if (adminEmail) {
      notificationService.sendDowngradeScheduled({
        to: adminEmail,
        schoolName: tenant.name,
        newPlan: PLAN_LABELS[newPlan],
        effectiveDate: effectiveDate.toLocaleDateString("es-MX", ...),
        billingUrl: `${APP}/dashboard/billing`,
      }).catch(err => console.error("[stripe-webhook]", err));
    }
  } else {
    // Upgrade — apply immediately to parent AND children
    await Promise.all([
      db.tenant.update({
        where: { id: tenant.id },
        data: { plan: newPlan, pendingPlan: null, pendingPlanAt: null },
      }),
      // NEW: Sync children back to non-inherited state
      db.tenant.updateMany({
        where: { parentTenantId: tenant.id },
        data: { isInheritedPlan: false, inheritedAt: null },
      }),
    ]);

    if (adminEmail) {
      notificationService.sendSubscriptionUpdated({
        to: adminEmail,
        schoolName: tenant.name,
        newPlan: PLAN_LABELS[newPlan],
        billingUrl: `${APP}/dashboard/billing`,
      }).catch(err => console.error("[stripe-webhook]", err));
    }
  }
  break;
}
```

### 2.2 Webhook Change: Apply Pending Downgrade on invoice.paid

When `invoice.paid` fires and a pending downgrade is due (lines 82-106):

```typescript
case "invoice.paid": {
  const invoice = event.data.object as Stripe.Invoice;
  const tenant = await db.tenant.findFirst({ 
    where: { stripeCustomerId: invoice.customer as string },
    include: { childTenants: true }  // NEW
  });
  if (!tenant) break;

  const pendingDowngradeDue = !!(
    tenant.pendingPlan && 
    tenant.pendingPlanAt && 
    tenant.pendingPlanAt <= new Date()
  );
  
  const recordPlan = pendingDowngradeDue ? tenant.pendingPlan! : tenant.plan;

  await Promise.all([
    db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: recordPlan,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: "paid",
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
      },
    }),
    db.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(pendingDowngradeDue ? { 
          plan: tenant.pendingPlan!, 
          pendingPlan: null, 
          pendingPlanAt: null 
        } : {}),
        status: "ACTIVE",
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    }),
    // NEW: On invoice.paid, children transition from inherited PRO to final plan
    //      Child limits must now use parent's finalized plan
    ...(pendingDowngradeDue && tenant.parentTenantId ? 
      [db.tenant.updateMany({
        where: { parentTenantId: tenant.id },
        data: { inheritedAt: new Date() },  // bump timestamp for audit
      })] 
      : []),
  ]);
  break;
}
```

### 2.3 Webhook Change: Handle Downgrade Cancellation

If parent cancels a pending downgrade (e.g., re-upgrades before period end):

```typescript
case "customer.subscription.updated": {
  // ... existing upgrade logic (lines 154-168) ...
  
  // NEW: On upgrade, restore children to non-inherited state
  //      This handles the "cancel downgrade" scenario
  if (oldPendingPlan && !isDowngrade(tenant.plan, newPlan)) {
    await db.tenant.updateMany({
      where: { parentTenantId: tenant.id },
      data: { isInheritedPlan: false, inheritedAt: null },
    });
  }
}
```

---

## 3. Plan Inheritance & Validation

### 3.1 Service Layer: Effective Plan Calculation

Add a helper function to `tenant.service.ts` to resolve the effective plan:

```typescript
/**
 * Returns the effective plan for a tenant.
 * If tenant is a child and isInheritedPlan=true, uses parent's effective plan.
 * Otherwise uses tenant's own plan.
 */
export async function getEffectivePlan(tenantId: string): Promise<SubscriptionPlan> {
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      pendingPlan: true,
      isInheritedPlan: true,
      parentTenantId: true,
      parentTenant: {
        select: {
          plan: true,
          pendingPlan: true,
          pendingPlanAt: true,
        },
      },
    },
  });

  if (!tenant.isInheritedPlan || !tenant.parentTenantId) {
    return tenant.plan;
  }

  // Child using parent's plan: return parent's effective plan
  // During downgrade period: pendingPlan > plan, so use pendingPlan
  if (
    tenant.parentTenant?.pendingPlan &&
    tenant.parentTenant.pendingPlanAt &&
    tenant.parentTenant.pendingPlanAt > new Date()
  ) {
    return tenant.parentTenant.pendingPlan;
  }

  return tenant.parentTenant?.plan ?? tenant.plan;
}
```

### 3.2 Service Layer: Rewrite Validation Functions

Update `canAddStudent()`, `canAddGroup()`, `canAddInstructor()` to use effective plan:

```typescript
export async function canAddStudent(tenantId: string): Promise<boolean> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan].maxStudents;
  if (limit === Infinity) return true;

  const count = await db.student.count({ 
    where: { tenantId, status: "ACTIVE" } 
  });
  
  return count < limit;
}

export async function canAddGroup(tenantId: string): Promise<boolean> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan].maxGroups;
  if (limit === Infinity) return true;

  const count = await db.group.count({ 
    where: { tenantId, isActive: true } 
  });
  
  return count < limit;
}

export async function canAddInstructor(tenantId: string): Promise<boolean> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan].maxInstructors;
  if (limit === Infinity) return true;

  const count = await db.instructor.count({ 
    where: { tenantId, isActive: true } 
  });
  
  return count < limit;
}

export async function canAddDiscipline(tenantId: string): Promise<boolean> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan].maxDisciplines;
  if (limit === Infinity) return true;

  const count = await db.discipline.count({ where: { tenantId } });
  return count < limit;
}
```

### 3.3 Service Layer: getTenantLimits

Add effective plan visibility to limits query:

```typescript
export async function getTenantLimits(tenantId: string) {
  const tenant = await db.tenant.findFirstOrThrow({ 
    where: { id: tenantId }
  });

  const effectivePlan = await getEffectivePlan(tenantId);
  const plan = PLANS[effectivePlan];
  const [studentCount, groupCount, instructorCount] = await Promise.all([
    db.student.count({ where: { tenantId, status: "ACTIVE" } }),
    db.group.count({ where: { tenantId, isActive: true } }),
    db.instructor.count({ where: { tenantId, isActive: true } }),
  ]);

  return {
    plan: effectivePlan,
    isInherited: tenant.isInheritedPlan,
    parentTenantId: tenant.parentTenantId,
    students: { used: studentCount, limit: plan.maxStudents },
    groups: { used: groupCount, limit: plan.maxGroups },
    instructors: { used: instructorCount, limit: plan.maxInstructors },
  };
}
```

---

## 4. API & Router Layer

### 4.1 tRPC Procedure: Validation Middleware

Add a validation middleware that blocks operations on child tenants under downgrade:

```typescript
// In trpc.ts, after hasTenant middleware:
const validatePlanCompliance = t.middleware(async ({ ctx, next, path }) => {
  if (!ctx.tenantId) return next();

  const tenant = await ctx.db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      id: true,
      plan: true,
      pendingPlan: true,
      isInheritedPlan: true,
      parentTenantId: true,
    },
  });

  if (!tenant) {
    throw new TRPCError({ 
      code: "NOT_FOUND", 
      message: "Tenant not found" 
    });
  }

  // Check if this is a mutation on a child tenant under downgrade
  const isMutation = path.includes("create") || path.includes("update") || 
                     path.includes("delete") || path.includes("add");
  
  if (isMutation && tenant.isInheritedPlan && tenant.parentTenantId) {
    const parent = await ctx.db.tenant.findUnique({
      where: { id: tenant.parentTenantId },
      select: { plan: true, pendingPlan: true, pendingPlanAt: true },
    });

    if (parent?.pendingPlan && parent.pendingPlanAt && parent.pendingPlanAt > new Date()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Parent school is downgrading to ${parent.pendingPlan} on ${parent.pendingPlanAt.toLocaleDateString()}. 
                  No new resources can be added to this school until the downgrade completes.`,
      });
    }
  }

  return next();
});

// Export enhanced tenantProcedure
export const tenantProcedure = t.procedure
  .use(errorHandler)
  .use(performanceMetrics)
  .use(hasTenant)
  .use(validatePlanCompliance)  // NEW
  .use(cacheInvalidation);
```

### 4.2 Student Creation Validation

Modify `students.ts` router to check effective plan:

```typescript
import { canAddStudent } from "@/server/services/tenant.service";

export const studentsRouter = createTRPCRouter({
  create: tenantProcedure
    .input(studentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const can = await canAddStudent(ctx.tenantId);
      if (!can) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Student limit reached for your plan.",
        });
      }

      return await ctx.db.student.create({
        data: {
          tenantId: ctx.tenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          // ... rest of fields ...
        },
      });
    }),
  // ... rest of router ...
});
```

### 4.3 Groups and Instructors: Same Pattern

Apply identical validation to groups and instructors:

```typescript
create: tenantProcedure
  .input(groupCreateSchema)
  .mutation(async ({ ctx, input }) => {
    const can = await canAddGroup(ctx.tenantId);
    if (!can) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Group limit reached for your plan.",
      });
    }
    // ... create group ...
  }),
```

---

## 5. User Interface & Tenant Switching

### 5.1 Tenant Switcher: Show Downgrade Status

Update `tenant-switcher.tsx` to display plan state:

```typescript
interface Tenant {
  id:            string;
  name:          string;
  isOwned:       boolean;
  isChild:       boolean;
  plan:          string;
  isDowngrading: boolean;  // NEW
  downgradeDate: Date | null;  // NEW
  isInherited:   boolean;  // NEW
}

// In renderTenant function:
const renderTenant = (t: Tenant) => (
  <button
    key={t.id}
    onClick={() => handleSwitch(t.id)}
    className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-800 dark:text-sb-light hover:bg-gray-50 dark:hover:bg-sb-house w-full group"
  >
    <div className="flex flex-col gap-1">
      <span className="truncate">{t.name}</span>
      {t.isChild && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t.isInherited ? "Synced to parent plan" : "Child school"}
        </span>
      )}
      {t.isDowngrading && (
        <span className="text-xs text-orange-600 dark:text-orange-400">
          Downgrading on {t.downgradeDate?.toLocaleDateString()}
        </span>
      )}
    </div>
    {t.id === activeTenantId && (
      <Check className="h-4 w-4 shrink-0 text-sb-accent dark:text-sb-light" />
    )}
  </button>
);
```

### 5.2 Downgrade Warning Banner

Add a component to display when child is under parent downgrade:

```typescript
// New component: DowngradePendingBanner.tsx
export function DowngradePendingBanner({
  parentName,
  downgradeDate,
  newPlan,
}: {
  parentName: string;
  downgradeDate: Date;
  newPlan: string;
}) {
  return (
    <div className="rounded-lg border border-orange-200 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-medium text-orange-900 dark:text-orange-100">
            Parent School Downgrading
          </h3>
          <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
            {parentName} is downgrading to {newPlan} on {downgradeDate.toLocaleDateString()}.
            You cannot add new students, groups, or instructors until the downgrade is complete.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 Student Form Validation UX

When user tries to add a student and hits the limit:

```typescript
const StudentForm = () => {
  const canAdd = trpc.tenants.canAddStudent.useQuery({ tenantId });
  
  if (!canAdd.data?.allowed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">{canAdd.data?.reason}</h3>
        {canAdd.data?.plan && (
          <p className="text-sm text-red-800 mt-2">
            Your {canAdd.data.plan} plan allows {canAdd.data.limit} students.
            You currently have {canAdd.data.used}.
          </p>
        )}
      </div>
    );
  }
  
  // ... normal form ...
};
```

---

## 6. Testing & Verification

### 6.1 Test Scenarios

| Scenario | Steps | Expected Outcome |
|----------|-------|------------------|
| **S1: Create child under ENTERPRISE** | 1. Parent: ENTERPRISE, 6 students 2. Create child tenant 3. Add 5 students to child | Children can add students without limit (inherited ENTERPRISE) |
| **S2: Parent downgrade → child blocked** | 1. Parent: ENTERPRISE→PRO (pending) 2. Try to add student to child | Child gets 403 with "Parent downgrading" message; isInheritedPlan=true |
| **S3: Downgrade completes** | 1. After invoice.paid with pending downgrade 2. Check child effective plan 3. Try to add 7th student to child | getEffectivePlan returns PRO; canAddStudent checks against 200-student limit; succeeds |
| **S4: Parent upgrades back** | 1. Parent: PRO→ENTERPRISE (immediate) 2. isInheritedPlan still true 3. Add 5 students to child | Children revert to non-inherited; own plan takes effect; succeeds |
| **S5: Downgrade cancellation** | 1. Parent has pending PRO downgrade 2. User re-upgrades to ENTERPRISE 3. Check child state | isInheritedPlan resets to false; child plan unchanged; operations unblocked |
| **S6: Multi-child sync** | 1. Parent ENTERPRISE with 3 child tenants 2. Parent downgrade triggered 3. Check all 3 children | All 3 children have isInheritedPlan=true and inheritedAt timestamp |
| **S7: Visibility bug (original)** | 1. Parent ENTERPRISE, 1 child 2. User creates student in child via API 3. Parent user queries child students via API | Student appears in child.students list with correct tenantId |
| **S8: Concurrency: downgrade + create** | 1. Downgrade webhook fires 2. Simultaneously, user creates student in child 3. Race condition resolution | Student creation either: (a) blocked if validatePlanCompliance runs first, or (b) created if mutation finished before webhook |

### 6.2 Data Consistency Checks

```sql
-- Check all children under downgrading parent are marked inherited
SELECT 
  parent.id AS parent_id,
  parent.name,
  parent.plan,
  parent.pending_plan,
  COUNT(child.id) AS child_count,
  SUM(CASE WHEN child.is_inherited_plan THEN 1 ELSE 0 END) AS inherited_count
FROM "Tenant" parent
LEFT JOIN "Tenant" child ON child.parent_tenant_id = parent.id
WHERE parent.pending_plan IS NOT NULL 
  AND parent.pending_plan != parent.plan
GROUP BY parent.id, parent.name, parent.plan, parent.pending_plan
HAVING COUNT(child.id) > 0;
```

### 6.3 Integration Test Example

```typescript
describe("Multi-school downgrade flow", () => {
  it("blocks student creation in child when parent downgrades", async () => {
    // 1. Create parent (ENTERPRISE)
    const parent = await db.tenant.create({
      data: { name: "Parent School", slug: "parent", plan: "ENTERPRISE" },
    });

    // 2. Create child
    const child = await db.tenant.create({
      data: { 
        name: "Child School", 
        slug: "child", 
        plan: "ENTERPRISE",
        parentTenantId: parent.id,
      },
    });

    // 3. Simulate downgrade webhook
    await db.tenant.update({
      where: { id: parent.id },
      data: { 
        pendingPlan: "PRO", 
        pendingPlanAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await db.tenant.updateMany({
      where: { parentTenantId: parent.id },
      data: { isInheritedPlan: true, inheritedAt: new Date() },
    });

    // 4. Try to create student in child
    const result = await trpc.students.create.mutate(
      { firstName: "Juan", lastName: "Pérez" },
      { tenantId: child.id }
    );

    // 5. Should be blocked
    expect(result).toThrow(/Parent school is downgrading/);
  });
});
```

---

## 7. Risks & Mitigations

### 7.1 Data Orphaning

**Risk:** If downgrade completes while a student was just created in child, the student becomes invisible.

**Scenario:** 
- Webhook sets isInheritedPlan=true
- User creates student in child (passed validation)
- Frontend queries child.students

**Mitigation:**
- Validate at API layer (✓ validatePlanCompliance middleware)
- Use database transactions for multi-step mutations
- Audit log all student creates with plan state at creation time
- Add periodic consistency job: `SELECT * FROM Student WHERE tenantId IN (SELECT id FROM Tenant WHERE isInheritedPlan=true) AND tenantId NOT IN (SELECT parentTenantId FROM Tenant)` → alert if orphans found

### 7.2 Concurrency Issues

**Risk:** Parent and child operations happen simultaneously during downgrade webhook.

**Scenarios:**
1. User creates student (mutation) while downgrade webhook updates isInheritedPlan
2. Parent downgrade webhook runs before child data is fetched

**Mitigations:**
- `tenantProcedure` uses cached tenant context (getEffectivePlan queries fresh data)
- Webhook updates are idempotent (updateMany with same conditions)
- Use database-level isolation: mutations use `SELECT ... FOR UPDATE` on parent tenant
- All plan checks read from database, not cache

**Implementation:**
```typescript
export async function getEffectivePlanWithLock(
  tenantId: string,
  tx?: PrismaClient
) {
  const db = tx ?? prisma;
  
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: {
      plan: true,
      isInheritedPlan: true,
      parentTenantId: true,
      parentTenant: {
        select: { plan: true, pendingPlan: true, pendingPlanAt: true },
      },
    },
  });

  if (!tenant.isInheritedPlan) return tenant.plan;
  
  // Re-fetch parent with lock if in transaction
  if (tenant.parentTenantId) {
    const parent = await db.tenant.findUnique({
      where: { id: tenant.parentTenantId },
    });
    if (parent?.pendingPlan && parent.pendingPlanAt && parent.pendingPlanAt > new Date()) {
      return parent.pendingPlan;
    }
    return parent?.plan ?? tenant.plan;
  }
  return tenant.plan;
}
```

### 7.3 Rollback Scenarios

**Risk:** If downgrade is cancelled/rolled back, children must exit inherited state.

**Mitigation:**
- Webhook handles all three transitions: downgrade, upgrade, cancel
- isInheritedPlan is set to false on any upgrade event
- inheritedAt timestamp provides audit trail for manual recovery
- If manual rollback needed: `UPDATE Tenant SET isInheritedPlan=false WHERE parentTenantId=$1 AND inheritedAt < $cutoffDate`

### 7.4 Multi-Webhook Race Conditions

**Risk:** Multiple Stripe webhooks arrive out of order (e.g., invoice.paid before customer.subscription.updated).

**Mitigation:**
- Webhooks are idempotent (upsert logic with WHERE clauses)
- Check `isDowngrade(old_plan, new_plan)` before setting inherited flag
- invoice.paid logic only finalizes if pendingPlanAt <= now
- Timestamp checks prevent old events from overwriting recent state

### 7.5 Child Tenant Visibility

**Risk:** User can be in both parent and child tenants; frontend must not show conflicting data.

**Mitigation:**
- Each tRPC call uses ctx.tenantId = user.activeTenantId (single tenant scope)
- Student queries filter by tenantId strictly
- Tenant switcher shows all memberships with inherited status badge
- When user activates a child under downgrade, UI shows warning banner

---

## 8. Implementation Roadmap

### Phase 1: Data Model & Webhooks (Sprint 1)
- [ ] Add `isInheritedPlan` and `inheritedAt` columns to Tenant
- [ ] Add index for parent-child lookups
- [ ] Update `customer.subscription.updated` webhook to sync children
- [ ] Update `invoice.paid` webhook for finalization
- [ ] Write and run migration
- [ ] Test webhook with staging Stripe events

**Deliverable:** Webhook correctly sets isInheritedPlan=true on downgrade, false on upgrade.

### Phase 2: Service Layer & Validation (Sprint 1)
- [ ] Implement `getEffectivePlan()` function
- [ ] Rewrite `canAddStudent/Group/Instructor/Discipline()` to use effective plan
- [ ] Update `getTenantLimits()` to expose inheritance state
- [ ] Add unit tests for plan calculation under all scenarios
- [ ] Stress test getEffectivePlan with concurrent queries

**Deliverable:** Service layer respects parent's effective plan for child tenants.

### Phase 3: API Layer & Validation Middleware (Sprint 2)
- [ ] Implement `validatePlanCompliance` middleware
- [ ] Add to tenantProcedure chain
- [ ] Update student/group/instructor create endpoints
- [ ] Test router-level blocking during downgrade
- [ ] Verify error messages are user-friendly

**Deliverable:** tRPC endpoints block resource creation when parent is downgrading.

### Phase 4: UI & User Experience (Sprint 2)
- [ ] Update tenant-switcher to show plan status and inherited flag
- [ ] Add DowngradePendingBanner component
- [ ] Update student form to show plan limit warnings
- [ ] Add visual indicators in group/instructor forms
- [ ] Test UX on mobile and desktop

**Deliverable:** Users see clear warnings before hitting limits or encountering blocks.

### Phase 5: Testing & Verification (Sprint 3)
- [ ] Implement all test scenarios from Section 6
- [ ] Write integration tests for webhook → validation → UI flow
- [ ] Load test: concurrent downgrades across 100 parent-child pairs
- [ ] Data consistency checks: run SQL audits
- [ ] Manual QA: end-to-end downgrade flow with real Stripe

**Deliverable:** 100% test coverage, zero orphaned data, no race conditions.

### Phase 6: Monitoring & Rollback (Sprint 3)
- [ ] Add Sentry/DataDog alerts for webhook failures
- [ ] Add alerts for orphaned students (isInheritedPlan child with created students)
- [ ] Document manual rollback procedures
- [ ] Deploy with feature flag (canToggle: false initially)
- [ ] Monitor production for 72 hours, then enable flag

**Deliverable:** Production deployment with observability and safe rollback path.

---

## 9. Success Criteria

1. **Functional Correctness:**
   - [ ] Child tenant cannot create student when parent is downgrading
   - [ ] Error message clearly explains parent downgrade reason
   - [ ] After downgrade completes, child can create students within PRO limit (200)
   - [ ] Parent upgrde immediately removes child restrictions

2. **Data Integrity:**
   - [ ] Zero orphaned students (students in child tenant that don't appear in queries)
   - [ ] All students created during downgrade period are tracked in audit log
   - [ ] isInheritedPlan and inheritedAt are accurately maintained

3. **Performance:**
   - [ ] getEffectivePlan() queries complete in < 10ms (95th percentile)
   - [ ] tenantProcedure validation adds < 5ms overhead
   - [ ] No N+1 queries when syncing 1000 child tenants on downgrade

4. **User Experience:**
   - [ ] Users receive in-app notification when downgrade starts
   - [ ] Tenant switcher shows inheritance status clearly
   - [ ] Error messages guide users to billing page
   - [ ] Mobile UI displays warnings without text overflow

5. **Observability:**
   - [ ] Sentry captures all TRPCErrors with plan validation context
   - [ ] Webhook success/failure logged with child sync count
   - [ ] Audit logs track all plan changes at service layer

---

## 10. References & Related Documents

- **Billing System Architecture:** [Internal Wiki: Stripe Integration]
- **Multi-Tenancy Guidelines:** [Internal Wiki: Tenant Isolation]
- **API Best Practices:** [Internal Wiki: tRPC Procedures]
- **Database Schema:** `/home/user/klassi/prisma/schema.prisma`
- **Webhook Handler:** `/home/user/klassi/src/app/api/webhooks/stripe/route.ts`
- **Tenant Service:** `/home/user/klassi/src/server/services/tenant.service.ts`

---

## Appendix: Code Snippets Summary

**Files to Modify:**
1. `prisma/schema.prisma` → Add Tenant columns
2. `src/app/api/webhooks/stripe/route.ts` → Webhook logic
3. `src/server/services/tenant.service.ts` → getEffectivePlan(), canAdd*() rewrite
4. `src/server/api/trpc.ts` → Add validatePlanCompliance middleware
5. `src/server/api/routers/students.ts` → Add validation on create
6. `src/server/api/routers/groups.ts` → Add validation on create
7. `src/server/api/routers/instructors.ts` → Add validation on create
8. `src/components/layout/tenant-switcher.tsx` → Show inheritance status
9. `src/components/billing/downgrade-pending-banner.tsx` → New component
10. `src/hooks/use-tenant-limits.ts` → Update to expose inherited flag

**Migration Path:**
- Create Prisma migration
- Deploy to staging, run tests
- Merge feature branch with flag disabled
- Monitor production metrics
- Enable flag for gradual rollout
- Full rollout after 48-hour observation period

---

**Document Approved By:** [Signature Line]  
**Approved Date:** ___________  
**Implementation Lead:** ___________  
**Review Date:** ___________
