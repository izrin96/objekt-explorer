import { RedisClient } from "bun";

export const redisPubSub = new RedisClient(process.env.REDIS_PUBSUB_URL || "");
