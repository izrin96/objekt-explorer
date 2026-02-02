import { Redis } from "ioredis";

import { env } from "@/env";

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export const redis = isBuild ? ({} as Redis) : new Redis(env.REDIS_URL);

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
