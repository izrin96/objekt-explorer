import { RedisClient } from "bun";

// Bun gives up after 10 reconnect attempts (about 30s) and stays down for good; this is its maximum
export const redis = new RedisClient(process.env.REDIS_URL, { maxRetries: 4294967295 });
