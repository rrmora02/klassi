import {
  invalidateUserCache,
  clearUserCache,
} from "./userAuthCache";
import {
  invalidateDisciplineCache as invalidateDisciplineCacheImpl,
  invalidateGroupCache as invalidateGroupCacheImpl,
  invalidateTenantCache as invalidateTenantCacheImpl,
  clearTenantDataCache,
} from "./tenantDataCache";

// ─── Cache Invalidation Stats ───────────────────────────────────

interface CacheInvalidationStats {
  disciplinesInvalidated: number;
  groupsInvalidated: number;
  tenantsInvalidated: number;
  usersInvalidated: number;
  totalInvalidations: number;
  lastInvalidationTime: Date | null;
}

let stats: CacheInvalidationStats = {
  disciplinesInvalidated: 0,
  groupsInvalidated: 0,
  tenantsInvalidated: 0,
  usersInvalidated: 0,
  totalInvalidations: 0,
  lastInvalidationTime: null,
};

export function getCacheInvalidationStats(): CacheInvalidationStats {
  return { ...stats };
}

function recordInvalidation(type: keyof Omit<CacheInvalidationStats, 'totalInvalidations' | 'lastInvalidationTime'>): void {
  stats[type]++;
  stats.totalInvalidations++;
  stats.lastInvalidationTime = new Date();
}

// ─── User cache invalidation ────────────────────────────────────

export function invalidateUserOnUpdate(clerkId: string): void {
  invalidateUserCache(clerkId);
  recordInvalidation('usersInvalidated');
}

export function invalidateUserOnDelete(clerkId: string): void {
  invalidateUserCache(clerkId);
  recordInvalidation('usersInvalidated');
}

// ─── Tenant cache invalidation ──────────────────────────────────

export function invalidateTenantOnDisciplineChange(tenantId: string): void {
  invalidateDisciplineCacheImpl(tenantId);
  recordInvalidation('disciplinesInvalidated');
}

export function invalidateTenantOnGroupChange(tenantId: string): void {
  invalidateGroupCacheImpl(tenantId);
  recordInvalidation('groupsInvalidated');
}

export function invalidateTenantOnConfigChange(tenantId: string): void {
  invalidateTenantCacheImpl(tenantId);
  recordInvalidation('tenantsInvalidated');
}

// ─── Re-export impl functions for middleware use ────────────────

export function invalidateDisciplineCache(tenantId: string): void {
  invalidateDisciplineCacheImpl(tenantId);
  recordInvalidation('disciplinesInvalidated');
}

export function invalidateGroupCache(tenantId: string): void {
  invalidateGroupCacheImpl(tenantId);
  recordInvalidation('groupsInvalidated');
}

export function invalidateTenantCache(tenantId: string): void {
  invalidateTenantCacheImpl(tenantId);
  recordInvalidation('tenantsInvalidated');
}

// ─── Batch invalidation ─────────────────────────────────────────

export function invalidateAllTenantCaches(tenantId: string): void {
  invalidateTenantCacheImpl(tenantId);
  recordInvalidation('tenantsInvalidated');
}

export function clearAllCaches(): void {
  clearUserCache();
  clearTenantDataCache();
  stats = {
    disciplinesInvalidated: 0,
    groupsInvalidated: 0,
    tenantsInvalidated: 0,
    usersInvalidated: 0,
    totalInvalidations: 0,
    lastInvalidationTime: null,
  };
  console.log("[CACHE] All caches cleared and stats reset");
}

