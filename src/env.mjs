import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    JWT_SECRET: z.string(),
    RAMPER_URL: z.string().url(),
    RAMPER_API_URL: z.string().url(),
    RAMPER_APP_ID: z.string(),
    RAMPER_USERAGENT: z.string(),
    INDEXER_PROXY_KEY: z.string(),
    INDEXER_PROXY_URL: z.string(),
    DB_PROXY_KEY: z.string(),
    DB_PROXY_URL: z.string(),
    DATABASE_URL: z.string(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
