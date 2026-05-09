import {
  invalidateUserCache,
  clearUserCache,
} from "./userAuthCache";
import {
  invalidateDisciplineCache,
  invalidateGroupCache,
  invalidateTenantCache,
  clearTenantDataCache,
} from "./tenantDataCache";

// User cache invalidation
export function invalidateUserOnUpdate(clerkId: string): void {
  invalidateUserCache(clerkId);
}

export function invalidateUserOnDelete(clerkId: string): void {
  invalidateUserCache(clerkId);
}

// Tenant cache invalidation
export function invalidateTenantOnDisciplineChange(tenantId: string): void {
  invalidateDisciplineCache(tenantId);
}

export function invalidateTenantOnGroupChange(tenantId: string): void {
  invalidateGroupCache(tenantId);
}

export function invalidateTenantOnConfigChange(tenantId: string): void {
  invalidateTenantCache(tenantId);
}

// Batch invalidation
export function invalidateAllTenantCaches(tenantId: string): void {
  invalidateTenantCache(tenantId);
}

export function clearAllCaches(): void {
  clearUserCache();
  clearTenantDataCache();
}
