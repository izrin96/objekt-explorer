import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "");

export const redisPubSub = new Redis(process.env.REDIS_PUBSUB_URL || "");
