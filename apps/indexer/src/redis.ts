import { RedisClient } from "bun";

import { env } from "./env";

const redis = new RedisClient(env.REDIS_URL);

/**
 * Bun stops reconnecting after maxRetries, so reconnect here rather than stay down after a long Valkey outage.
 */
export async function publish(channel: string, message: string) {
  if (!redis.connected) {
    await redis.connect();
  }
  return redis.publish(channel, message);
}
