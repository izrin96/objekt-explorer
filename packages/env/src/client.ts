import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SITE_URL: z.string().min(1),
    VITE_UMAMI_SCRIPT_URL: z.string().min(1),
    VITE_UMAMI_WEBSITE_ID: z.string().min(1),
    VITE_ACTIVITY_WEBSOCKET_URL: z.string().min(1),
    VITE_LIVE_API_KEY: z.string().min(1),
    VITE_PRIVY_APP_ID: z.string().min(1),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
