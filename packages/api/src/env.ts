import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const serverEnv = createEnv({
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
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_PUBLIC_URL: z.string().optional(),
    SES_REGION: z.string().min(1),
    SES_ACCESS_KEY: z.string().min(1),
    SES_SECRET_KEY: z.string().min(1),
    SES_MAIL_FROM: z.string().min(1),
    BYPASS_LIVE_KEY: z.string().min(1).optional(),
    REDIS_URL: z.string().min(1),
    COSMO_KEY: z.string().min(1),
    // the public origin Better Auth signs in on and the only one it accepts;
    // required, or Better Auth would take it from the request's own Host
    BETTER_AUTH_URL: z.url(),
    // client
    VITE_UMAMI_SCRIPT_URL: z.string().min(1).optional(),
    VITE_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
    VITE_ACTIVITY_WEBSOCKET_URL: z.string().optional(),
    VITE_LIVE_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
