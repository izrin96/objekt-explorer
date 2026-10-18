import { ORPCError, ValidationError } from "@orpc/server";
import { serverEnv } from "@repo/api/env";
import {
  DATA_COLLECTION,
  isExpectedError,
  scrubBreadcrumb,
  scrubEvent,
} from "@repo/lib/error-scrub";
import * as Sentry from "@sentry/bun";

/** Starts the server SDK once; without `SENTRY_DSN` it stays off and every capture is a no-op. */
export function initServerErrorTracking() {
  const dsn = serverEnv.SENTRY_DSN;
  // a dev-server reload evaluates the entry again
  if (!dsn || Sentry.getClient()) return;
  Sentry.init({
    dsn,
    environment: serverEnv.SENTRY_ENVIRONMENT,
    release: serverEnv.SENTRY_RELEASE,
    dataCollection: DATA_COLLECTION,
    integrations: [
      // Bun exits on an unhandled rejection; the SDK's default would only log it
      Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    ],
    beforeSend: (event, hint) =>
      isExpectedError(hint.originalException) ? null : scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });
}

/**
 * The error that names the bug: oRPC wraps anything unknown as INTERNAL_SERVER_ERROR, which would
 * put every 500 in one issue. Output validation keeps the wrapper; its cause holds the output.
 */
function reportable(error: unknown) {
  if (
    error instanceof ORPCError &&
    error.code === "INTERNAL_SERVER_ERROR" &&
    error.cause instanceof Error &&
    !(error.cause instanceof ValidationError)
  ) {
    return error.cause;
  }
  return error;
}

/**
 * Reports an unexpected server error. No user is attached: the server shares one scope across
 * concurrent requests, so a user set there would land on another request's error.
 */
export function captureServerError(error: unknown, tags?: Record<string, string>) {
  if (isExpectedError(error)) return;
  Sentry.captureException(reportable(error), tags ? { tags } : undefined);
}

/** Sends what is queued; `server.ts` calls it on SIGTERM before the process exits. */
export async function flushErrorTracking() {
  if (Sentry.getClient()) await Sentry.flush(2000);
}
