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
    BROWSER_CDP_URL: z.string().min(1),
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
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().min(1),
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL: z.string().min(1),
    NEXT_PUBLIC_LIVE_API_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL: process.env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL,
    NEXT_PUBLIC_LIVE_API_KEY: process.env.NEXT_PUBLIC_LIVE_API_KEY,
  },
});
