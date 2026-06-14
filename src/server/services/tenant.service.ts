import { db } from "@/server/db";
import { PLANS } from "@/config/plans";
import type { SubscriptionPlan } from "@prisma/client";

export async function getEffectivePlan(tenantId: string): Promise<SubscriptionPlan | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      parentTenantId: true,
      effectivePlanCache: true,
      effectivePlanCacheAt: true,
    },
  });

  if (!tenant) return null;

  // Si no hay parent, retornar el plan propio
  if (!tenant.parentTenantId) return tenant.plan;

  // Cache hit: si existe cache fresco (< 5 min), retornarlo
  if (tenant.effectivePlanCache && tenant.effectivePlanCacheAt) {
    const ageMs = Date.now() - tenant.effectivePlanCacheAt.getTime();
    if (ageMs < 5 * 60 * 1000) {
      return tenant.effectivePlanCache;
    }
  }

  // Cache miss: obtener parent plan y cachear
  const parent = await db.tenant.findUnique({
    where: { id: tenant.parentTenantId },
    select: { plan: true },
  });

  const parentPlan = parent?.plan ?? "STARTER";

  // Actualizar cache
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      effectivePlanCache: parentPlan,
      effectivePlanCacheAt: new Date(),
    },
  }).catch(() => {
    // Si la actualización falla (ej: race condition), no fallar el procedimiento
  });

  return parentPlan;
}

export async function isChildBlocked(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { blockChildWrites: true, parentTenantId: true },
  });

  if (!tenant) return false;
  return tenant.blockChildWrites && !!tenant.parentTenantId;
}

export async function canAddStudent(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;

  // Si child está bloqueado, rechazar
  if (tenant.blockChildWrites) return false;

  // Usar plan efectivo (considera parent)
  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan ?? "STARTER"].maxStudents;
  if (limit === Infinity) return true;

  const count = await db.student.count({ where: { tenantId, status: "ACTIVE" } });
  return count < limit;
}

export async function canAddGroup(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;

  // Si child está bloqueado, rechazar
  if (tenant.blockChildWrites) return false;

  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan ?? "STARTER"].maxGroups;
  if (limit === Infinity) return true;

  const count = await db.group.count({ where: { tenantId, isActive: true } });
  return count < limit;
}

export async function canAddInstructor(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;

  // Si child está bloqueado, rechazar
  if (tenant.blockChildWrites) return false;

  const effectivePlan = await getEffectivePlan(tenantId);
  const limit = PLANS[effectivePlan ?? "STARTER"].maxInstructors;
  if (limit === Infinity) return true;

  const count = await db.instructor.count({ where: { tenantId, isActive: true } });
  return count < limit;
}

export async function canAddDiscipline(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;
  const limit = PLANS[tenant.plan].maxDisciplines;
  if (limit === Infinity) return true;
  const count = await db.discipline.count({ where: { tenantId } });
  return count < limit;
}

export async function canAddSchool(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  // Buscar el tenant activo del usuario
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeTenantId: true },
  });
  if (!user?.activeTenantId) return { allowed: false, reason: "Sin tenant activo", currentCount: 0, limit: 0 };

  const tenant = await db.tenant.findUnique({
    where:  { id: user.activeTenantId },
    select: { plan: true, status: true },
  });
  if (!tenant) return { allowed: false, reason: "Tenant no encontrado", currentCount: 0, limit: 0 };

  if (tenant.plan !== "ENTERPRISE") {
    return {
      allowed:      false,
      reason:       "Solo el plan Enterprise permite múltiples escuelas",
      currentCount: 1,
      limit:        PLANS[tenant.plan].schools,
    };
  }

  if (tenant.status !== "ACTIVE") {
    return { allowed: false, reason: "La suscripción no está activa", currentCount: 0, limit: 0 };
  }

  // Contar escuelas creadas por este usuario
  const count = await db.tenant.count({ where: { createdByUserId: userId } });
  const limit = PLANS.ENTERPRISE.schools;

  return { allowed: count < limit, currentCount: count, limit };
}

export async function getTenantLimits(tenantId: string) {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant no encontrado");

  const plan = PLANS[tenant.plan];
  const [studentCount, groupCount, instructorCount] = await Promise.all([
    db.student.count({ where: { tenantId, status: "ACTIVE" } }),
    db.group.count({ where: { tenantId, isActive: true } }),
    db.instructor.count({ where: { tenantId, isActive: true } }),
  ]);

  return {
    plan:        tenant.plan,
    students:    { used: studentCount,    limit: plan.maxStudents    },
    groups:      { used: groupCount,      limit: plan.maxGroups      },
    instructors: { used: instructorCount, limit: plan.maxInstructors },
  };
}
