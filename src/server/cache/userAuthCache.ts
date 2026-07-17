import { InMemoryCache } from "./index";
import type { User } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const USER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const userCache = new InMemoryCache<string, User | null>(USER_CACHE_TTL);

export async function getUserByClerkId(
  clerkId: string,
  db: PrismaClient
): Promise<User | null> {
  const cached = userCache.get(clerkId);
  if (cached !== undefined) {
    console.log(`[CACHE HIT] User ${clerkId} found in cache (${cached ? 'user: ' + cached.email : 'null'})`);
    return cached;
  }

  console.log(`[CACHE MISS] User ${clerkId} not in cache, querying database...`);
  const user = await db.user.findUnique({
    where: { clerkId },
  });

  // No cachear null: durante el signup el usuario aún no existe en BD y
  // cachear la ausencia lo dejaría "invisible" hasta 10 min después de crearse.
  if (user) {
    userCache.set(clerkId, user);
    console.log(`[CACHE SET] User ${clerkId} cached (user: ${user.email})`);
  }
  return user;
}

export function invalidateUserCache(clerkId: string): void {
  userCache.delete(clerkId);
}

export function clearUserCache(): void {
  userCache.clear();
}

export function getUserCacheStats(): { size: number } {
  return { size: userCache.size() };
}
