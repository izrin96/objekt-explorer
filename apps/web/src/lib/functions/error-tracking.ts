import { serverEnv } from "@repo/api/env";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import type { ErrorTrackingConfig } from "@/lib/error-tracking";

/** Read at runtime, so no build carries a DSN; null keeps the browser SDK off. */
export const getErrorTrackingConfig = createServerFn({ method: "GET" }).handler(
  (): ErrorTrackingConfig | null =>
    serverEnv.SENTRY_DSN
      ? {
          dsn: serverEnv.SENTRY_DSN,
          environment: serverEnv.SENTRY_ENVIRONMENT ?? null,
          release: serverEnv.SENTRY_RELEASE ?? null,
        }
      : null,
);

// fetched once during SSR and kept for the tab's life, so no navigation waits on the server
export const errorTrackingOptions = queryOptions({
  queryKey: ["error-tracking"],
  queryFn: () => getErrorTrackingConfig(),
  staleTime: "static",
  gcTime: Infinity,
});
