import { RedisClient } from "bun";

import { serverEnv } from "@/lib/env/server";

export const redis = new RedisClient(serverEnv.REDIS_URL);

export async function getCache<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
): Promise<T> {
  const cachedData = await redis.get(key);

  if (cachedData) {
    try {
      return JSON.parse(cachedData) as T;
    } catch {
      // corrupted cache entry — drop it and fall through to refresh
      await redis.del(key);
    }
  }

  const freshData = await callback();
  await redis.set(key, JSON.stringify(freshData), "EX", ttl);
  return freshData;
}

/**
 * Per-key fixed-window rate limit. Increments the counter and, on the
 * first hit, sets a TTL. Returns the current attempt count.
 *
 * Atomicity note: INCR and EXPIRE are two round-trips. If the process
 * crashes between them on the first call, the TTL is never set and the
 * key will live forever. Callers should treat an unexpectedly large
 * count as "blocked" (cap the comparison).
 */
export async function rateLimit(key: string, windowSeconds: number): Promise<number> {
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, windowSeconds);
  }
  return attempts;
}
