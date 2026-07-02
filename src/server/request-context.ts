import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

/**
 * Identidad del request (usuario + escuela activa + membresías) deduplicada
 * por render con React.cache(): layout, TopBar y páginas comparten UNA sola
 * consulta por request en lugar de repetir user/tenant/tenantUser cada uno.
 */
export const getCurrentContext = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      activeTenantId: true,
      activeTenant: {
        select: {
          id: true,
          name: true,
          plan: true,
          status: true,
          trialEndsAt: true,
          pendingPlan: true,
          pendingPlanAt: true,
          parentTenantId: true,
        },
      },
      memberships: {
        select: {
          tenantId: true,
          role: true,
          tenant: {
            select: {
              id: true,
              name: true,
              parentTenantId: true,
              createdByUserId: true,
              blockChildWrites: true,
              blockChildWritesReason: true,
              parentTenant: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return null;

  const activeMembership = user.memberships.find(m => m.tenantId === user.activeTenantId) ?? null;

  return {
    clerkId: userId,
    user,
    activeTenant: user.activeTenant,
    /** Rol en la escuela activa; null si no hay membresía real */
    activeRole: activeMembership?.role ?? null,
  };
});

export type CurrentContext = NonNullable<Awaited<ReturnType<typeof getCurrentContext>>>;
