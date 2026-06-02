import { db } from "@/server/db";
import { PLANS } from "@/config/plans";

export async function canAddStudent(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;
  const limit = PLANS[tenant.plan].maxStudents;
  if (limit === Infinity) return true;
  const count = await db.student.count({ where: { tenantId, status: "ACTIVE" } });
  return count < limit;
}

export async function canAddGroup(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;
  const limit = PLANS[tenant.plan].maxGroups;
  if (limit === Infinity) return true;
  const count = await db.group.count({ where: { tenantId, isActive: true } });
  return count < limit;
}

export async function canAddInstructor(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;
  const limit = PLANS[tenant.plan].maxInstructors;
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
