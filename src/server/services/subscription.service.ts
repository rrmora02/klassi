import type { PrismaClient, SubscriptionPlan, Prisma } from "@prisma/client";
import { PLAN_LABELS } from "@/lib/plan-limits";

/**
 * Sincroniza las escuelas hijas con el plan efectivo del padre.
 *
 * - ENTERPRISE  → desbloquea las hijas y refresca su effectivePlanCache.
 * - otro plan   → las bloquea (solo lectura) con el motivo indicado.
 *
 * Es idempotente y es un no-op si el tenant no tiene hijas.
 */
export async function syncChildTenants(
  db: PrismaClient,
  parentTenantId: string,
  plan: SubscriptionPlan,
  opts?: { reason?: string }
): Promise<void> {
  const blocked = plan !== "ENTERPRISE";
  await db.tenant.updateMany({
    where: { parentTenantId },
    data: {
      blockChildWrites: blocked,
      blockChildWritesReason: blocked
        ? opts?.reason ??
          `Plan de escuela principal es ${PLAN_LABELS[plan]}. Las escuelas adicionales solo están disponibles en Enterprise.`
        : null,
      effectivePlanCache: plan,
      effectivePlanCacheAt: new Date(),
    },
  });
}

/**
 * Único punto de escritura de tenant.plan para webhooks y reconciliación:
 * aplica el plan, limpia cualquier downgrade pendiente y sincroniza hijas.
 */
export async function applyPlanChange(
  db: PrismaClient,
  tenantId: string,
  newPlan: SubscriptionPlan,
  extraTenantData: Prisma.TenantUpdateInput = {}
): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: { plan: newPlan, pendingPlan: null, pendingPlanAt: null, ...extraTenantData },
  });
  await syncChildTenants(db, tenantId, newPlan);
}

/**
 * Cancela un downgrade programado (el cliente volvió a su plan actual) y
 * re-sincroniza las hijas al plan vigente.
 */
export async function revertPendingDowngrade(
  db: PrismaClient,
  tenantId: string,
  currentPlan: SubscriptionPlan
): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: { pendingPlan: null, pendingPlanAt: null },
  });
  await syncChildTenants(db, tenantId, currentPlan);
}
