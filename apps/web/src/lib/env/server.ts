import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    INDEXER_DATABASE_URL: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),
    TWITTER_CLIENT_ID: z.string().min(1),
    TWITTER_CLIENT_SECRET: z.string().min(1),
    S3_ENDPOINT: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    SES_REGION: z.string().min(1),
    SES_ACCESS_KEY: z.string().min(1),
    SES_SECRET_KEY: z.string().min(1),
    SES_MAIL_FROM: z.string().min(1),
    BYPASS_LIVE_KEY: z.string().min(1).optional(),
    REDIS_URL: z.string().min(1),
  },
  experimental__runtimeEnv: process.env,
});
