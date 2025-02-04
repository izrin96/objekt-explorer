import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    INDEXER_PROXY_KEY: z.string(),
    INDEXER_PROXY_URL: z.string(),
    DB_PROXY_KEY: z.string(),
    DB_PROXY_URL: z.string(),
    DATABASE_URL: z.string().optional(),
    VERCEL_URL: z.string().optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
});
