import { RedisClient } from "bun";

export const pubsub = new RedisClient(process.env.REDIS_URL);
