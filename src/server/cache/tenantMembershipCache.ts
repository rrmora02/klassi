import { InMemoryCache } from "./index";
import type { PrismaClient, UserRole } from "@prisma/client";

// Membresía tenant↔usuario con el estado de suscripción de la escuela.
// Es la consulta más caliente de la app: hasTenantRole la ejecutaba en CADA
// llamada tRPC. TTL corto (60 s) porque respalda enforcement de suscripción
// y roles: un cambio de rol/estado tarda como máximo 60 s en propagarse a
// otras instancias; en esta instancia se invalida explícitamente.

const MEMBERSHIP_CACHE_TTL = 60 * 1000; // 60 s

export interface CachedMembership {
  role: UserRole;
  tenant: {
    status: string;
    trialEndsAt: Date | null;
    blockChildWrites: boolean;
    blockChildWritesReason: string | null;
  };
}

const membershipCache = new InMemoryCache<string, CachedMembership>(MEMBERSHIP_CACHE_TTL);

const key = (tenantId: string, userId: string) => `${tenantId}:${userId}`;

export async function getTenantMembership(
  tenantId: string,
  userId: string,
  db: PrismaClient,
): Promise<CachedMembership | null> {
  const cached = membershipCache.get(key(tenantId, userId));
  if (cached !== undefined) return cached;

  const membership = await db.tenantUser.findUnique({
    where:  { tenantId_userId: { tenantId, userId } },
    select: {
      role: true,
      tenant: { select: { status: true, trialEndsAt: true, blockChildWrites: true, blockChildWritesReason: true } },
    },
  });

  // No cachear la ausencia: un recién invitado quedaría "sin escuela" hasta
  // que expire el TTL. La ausencia real (usuario removido) es caso raro.
  if (membership) {
    membershipCache.set(key(tenantId, userId), membership);
  }
  return membership;
}

/** Invalidar al remover a un usuario del equipo o cambiar su rol. */
export function invalidateTenantMembership(tenantId: string, userId: string): void {
  membershipCache.delete(key(tenantId, userId));
}

/** Invalidar todas las membresías de una escuela (cambio de plan/estado). */
export function invalidateTenantMemberships(tenantId: string): void {
  membershipCache.deleteByPattern((k) => k.startsWith(`${tenantId}:`));
}
