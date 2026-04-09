import { db } from "@/server/db";
import { PLANS, type Plan } from "@/config/plans";
import type { Tenant } from "@prisma/client";

/**
 * Obtiene un tenant por su clerkOrgId.
 * Lanza error si no existe.
 */
export async function getTenantByOrgId(clerkOrgId: string): Promise<Tenant> {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId } });
  if (!tenant) throw new Error(`Tenant no encontrado para orgId: ${clerkOrgId}`);
  return tenant;
}

/**
 * Verifica si un tenant puede agregar más alumnos según su plan.
 */
export async function canAddStudent(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;

  const limit = PLANS[tenant.plan].maxStudents;
  if (limit === Infinity) return true;

  const count = await db.student.count({ where: { tenantId, status: "ACTIVE" } });
  return count < limit;
}

/**
 * Verifica si un tenant puede agregar más disciplinas según su plan.
 */
export async function canAddDiscipline(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;

  const limit = PLANS[tenant.plan].maxDisciplines;
  if (limit === Infinity) return true;

  const count = await db.discipline.count({ where: { tenantId, isActive: true } });
  return count < limit;
}

/**
 * Verifica si un tenant tiene acceso al portal de padres.
 */
export async function hasParentPortal(tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) return false;
  return PLANS[tenant.plan].parentPortal;
}

/**
 * Devuelve los límites del plan actual del tenant.
 */
export async function getTenantLimits(tenantId: string) {
  const tenant = await db.tenant.findFirst({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant no encontrado");

  const plan = PLANS[tenant.plan];
  const [studentCount, disciplineCount, userCount] = await Promise.all([
    db.student.count({ where: { tenantId, status: "ACTIVE" } }),
    db.discipline.count({ where: { tenantId, isActive: true } }),
    db.user.count({ where: { tenantId } }),
  ]);

  return {
    plan: tenant.plan,
    students:    { used: studentCount,   limit: plan.maxStudents },
    disciplines: { used: disciplineCount, limit: plan.maxDisciplines },
    users:       { used: userCount,       limit: plan.maxUsers },
    parentPortal: plan.parentPortal,
    multiSede:    plan.multiSede,
  };
}
