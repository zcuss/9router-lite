import { getRedis } from "./redis";
import type { Role } from "./auth/rbac";
import { getDailyLimit } from "./auth/rbac";

export async function checkRateLimit(userId: string, role: Role): Promise<{ allowed: boolean; remaining: number }> {
  const limit = getDailyLimit(role);
  if (limit === null) return { allowed: true, remaining: -1 };

  const redis = await getRedis();
  const key = `user:quota:${userId}`;
  const now = Date.now();
  const windowStart = now - 86400 * 1000;

  // Cleanup old requests
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count requests in window
  const count = await redis.zcard(key);
  
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random().toString(36).substring(2)}`);
  await redis.expire(key, 86400);

  return { allowed: true, remaining: limit - count - 1 };
}
