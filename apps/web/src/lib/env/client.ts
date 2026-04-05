import { env as runtimeEnv } from "next-runtime-env";
import * as z from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().min(1),
  NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL: z.string().min(1),
  NEXT_PUBLIC_LIVE_API_KEY: z.string().min(1),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: runtimeEnv("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_UMAMI_SCRIPT_URL: runtimeEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL"),
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: runtimeEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID"),
  NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL: runtimeEnv("NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL"),
  NEXT_PUBLIC_LIVE_API_KEY: runtimeEnv("NEXT_PUBLIC_LIVE_API_KEY"),
});
