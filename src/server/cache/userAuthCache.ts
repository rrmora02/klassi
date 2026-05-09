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
    return cached;
  }

  const user = await db.user.findUnique({
    where: { clerkId },
  });

  userCache.set(clerkId, user);
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
