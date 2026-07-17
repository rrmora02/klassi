import { TRPCError } from "@trpc/server";
import {
  invalidateDisciplineCache,
  invalidateGroupCache,
  invalidateTenantCache,
} from "./invalidation";

type EntityType = "discipline" | "group" | "user" | null;

function extractEntityFromPath(path: string): EntityType {
  if (path.includes("discipline")) return "discipline";
  if (path.includes("group")) return "group";
  if (path.includes("profile") || path.includes("team.inviteMember")) return "user";
  return null;
}

async function invalidateCacheForEntity(
  entityType: EntityType,
  tenantId: string | null
): Promise<void> {
  if (!tenantId || !entityType) return;

  try {
    switch (entityType) {
      case "discipline":
        invalidateDisciplineCache(tenantId);
        console.log(`[CACHE INVALIDATE] Discipline cache cleared for tenant ${tenantId}`);
        break;
      case "group":
        invalidateGroupCache(tenantId);
        console.log(`[CACHE INVALIDATE] Group cache cleared for tenant ${tenantId}`);
        break;
      case "user":
        invalidateTenantCache(tenantId);
        console.log(`[CACHE INVALIDATE] Tenant cache cleared for tenant ${tenantId}`);
        break;
    }
  } catch (error) {
    console.error(`[CACHE INVALIDATE ERROR] Failed to invalidate ${entityType} cache:`, error);
  }
}

export function createCacheInvalidationMiddleware(t: any) {
  return t.middleware(async ({ next, ctx, path, type }: any) => {
    const result = await next();

    if (type !== "mutation") {
      return result;
    }

    const entityType = extractEntityFromPath(path);
    await invalidateCacheForEntity(entityType, ctx.tenantId);

    return result;
  });
}
