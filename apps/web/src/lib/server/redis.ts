import { RedisClient } from "bun";

import { env } from "@/env";

export const redis = new RedisClient(env.REDIS_URL);

export async function getCache<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>,
): Promise<T> {
  const cachedData = await redis.get(key);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const freshData = await callback();
  await redis.set(key, JSON.stringify(freshData), "EX", ttl);
  return freshData;
}
