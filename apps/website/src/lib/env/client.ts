import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const clientEnv = createEnv({
  client: {
    VITE_SITE_URL: z.string().min(1),
    VITE_UMAMI_SCRIPT_URL: z.string().min(1).optional(),
    VITE_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
    VITE_ACTIVITY_WEBSOCKET_URL: z.string().min(1),
    VITE_LIVE_API_KEY: z.string().min(1),
  },
  clientPrefix: "VITE_",
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
