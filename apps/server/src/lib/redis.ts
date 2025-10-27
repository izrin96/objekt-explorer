import Redis from "ioredis";

export const redisPubSub = new Redis(process.env.REDIS_PUBSUB_URL || "");
