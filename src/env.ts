import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod/v4";

export const env = createEnv({
  server: {
    INDEXER_PROXY_KEY: z.string(),
    INDEXER_PROXY_URL: z.string(),
    DATABASE_URL: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    TWITTER_CLIENT_ID: z.string(),
    TWITTER_CLIENT_SECRET: z.string(),
    BROWSER_CDP_URL: z.string(),
    S3_ENDPOINT: z.string(),
    S3_PORT: z.coerce.number(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_USE_SSL: z.coerce.boolean(),
    SES_REGION: z.string(),
    SES_ACCESS_KEY: z.string(),
    SES_SECRET_KEY: z.string(),
    SES_MAIL_FROM: z.string(),
    COSMO_SHOP_RECAPTCHA_KEY: z.string(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.string().optional(),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL: z.string().optional(),
    NEXT_PUBLIC_LIVE_API_KEY: z.string(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL:
      process.env.NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL,
    NEXT_PUBLIC_LIVE_API_KEY: process.env.NEXT_PUBLIC_LIVE_API_KEY,
  },
});
