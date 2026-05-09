import { InMemoryCache } from "./index";
import type { Discipline, Group, Tenant } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const TENANT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const disciplineCache = new InMemoryCache<string, Discipline[]>(TENANT_CACHE_TTL);
const groupCache = new InMemoryCache<string, Group[]>(TENANT_CACHE_TTL);
const tenantCache = new InMemoryCache<string, Tenant | null>(TENANT_CACHE_TTL);

// Discipline caching
export async function getDisciplinesByTenant(
  tenantId: string,
  db: PrismaClient
): Promise<Discipline[]> {
  const cacheKey = `${tenantId}:disciplines`;
  const cached = disciplineCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[CACHE HIT] Disciplines for tenant ${tenantId} found in cache (${cached.length} items)`);
    return cached;
  }

  console.log(`[CACHE MISS] Disciplines for tenant ${tenantId} not in cache, querying database...`);
  const disciplines = await db.discipline.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  });

  disciplineCache.set(cacheKey, disciplines);
  console.log(`[CACHE SET] Disciplines for tenant ${tenantId} cached (${disciplines.length} items)`);
  return disciplines;
}

export function invalidateDisciplineCache(tenantId: string): void {
  const cacheKey = `${tenantId}:disciplines`;
  disciplineCache.delete(cacheKey);
}

// Group caching
export async function getActiveGroupsByTenant(
  tenantId: string,
  db: PrismaClient
): Promise<Group[]> {
  const cacheKey = `${tenantId}:groups:active`;
  const cached = groupCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[CACHE HIT] Active groups for tenant ${tenantId} found in cache (${cached.length} items)`);
    return cached;
  }

  console.log(`[CACHE MISS] Active groups for tenant ${tenantId} not in cache, querying database...`);
  const groups = await db.group.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  });

  groupCache.set(cacheKey, groups);
  console.log(`[CACHE SET] Active groups for tenant ${tenantId} cached (${groups.length} items)`);
  return groups;
}

export function invalidateGroupCache(tenantId: string): void {
  const cacheKey = `${tenantId}:groups:active`;
  groupCache.delete(cacheKey);
}

// Tenant info caching
export async function getTenantByIdCached(
  tenantId: string,
  db: PrismaClient
): Promise<Tenant | null> {
  const cached = tenantCache.get(tenantId);
  if (cached !== undefined) {
    return cached;
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  tenantCache.set(tenantId, tenant);
  return tenant;
}

export function invalidateTenantCache(tenantId: string): void {
  const cacheKey = tenantId;
  tenantCache.delete(cacheKey);
  invalidateDisciplineCache(tenantId);
  invalidateGroupCache(tenantId);
}

export function clearTenantDataCache(): void {
  disciplineCache.clear();
  groupCache.clear();
  tenantCache.clear();
}

export function getTenantDataCacheStats(): { disciplines: number; groups: number; tenants: number } {
  return {
    disciplines: disciplineCache.size(),
    groups: groupCache.size(),
    tenants: tenantCache.size(),
  };
}
