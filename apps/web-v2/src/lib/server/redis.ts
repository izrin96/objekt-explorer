import { Redis } from "ioredis";
import { env } from "../env/server";

export const redis = new Redis(env.REDIS_URL);

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
