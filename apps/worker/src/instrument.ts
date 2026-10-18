import {
  DATA_COLLECTION,
  isExpectedError,
  scrubBreadcrumb,
  scrubEvent,
} from "@repo/lib/error-scrub";
import * as Sentry from "@sentry/bun";

import { errorReport, setErrorSink } from "./lib/log";

// index.ts imports this before its job modules, so the SDK is up before any job runs
const dsn = process.env.WORKER_SENTRY_DSN || undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || undefined,
    release: process.env.SENTRY_RELEASE || undefined,
    dataCollection: DATA_COLLECTION,
    integrations: [
      // Bun exits on an unhandled rejection; the SDK's default would only log it
      Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    ],
    beforeSend: (event, hint) =>
      isExpectedError(hint.originalException) ? null : scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });

  // every `log(tag).error` is a failed job or one only a person can fix
  setErrorSink((tag, args) => {
    const { error, message } = errorReport(args);
    Sentry.withScope((scope) => {
      scope.setTag("job", tag);
      if (error) {
        scope.setExtra("log", message);
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(`[${tag}] ${message}`, "error");
      }
    });
  });
}

/** Sends what is queued before the process exits; a no-op when tracking is off. */
export async function flushErrorTracking() {
  if (dsn) await Sentry.flush(2000);
}
