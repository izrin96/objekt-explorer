import {
  DATA_COLLECTION,
  isExpectedError,
  scrubBreadcrumb,
  scrubEvent,
} from "@repo/lib/error-scrub";
import type * as SentryReact from "@sentry/react";
import type { ErrorInfo } from "react";

import { isFromServer } from "@/lib/orpc-error";

export type ErrorTrackingConfig = {
  dsn: string;
  environment: string | null;
  release: string | null;
};

// a type only: the SDK itself is imported on demand
type Sdk = typeof SentryReact;

/** Same-origin route that forwards envelopes to GlitchTip, which browsers cannot reach. */
const TUNNEL = "/api/errors";

/** The root document writes the runtime config into these, for the client to read before hydrating. */
const META = {
  dsn: "error-tracking-dsn",
  environment: "error-tracking-env",
  release: "error-tracking-release",
};

export function ErrorTrackingMeta({ config }: { config: ErrorTrackingConfig | null }) {
  if (!config) return null;
  return (
    <>
      <meta name={META.dsn} content={config.dsn} />
      {config.environment && <meta name={META.environment} content={config.environment} />}
      {config.release && <meta name={META.release} content={config.release} />}
    </>
  );
}

function readMeta(name: string) {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined;
}

/**
 * Reported from the browser: not a refusal, not any oRPC error, and not an error SSR or a server
 * function sent over, since the server reported those itself.
 */
function shouldReport(error: unknown) {
  if (isExpectedError(error) || isFromServer(error)) return false;
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  return !(typeof status === "number" && typeof code === "string");
}

// stays null without a DSN, so nothing of the SDK is downloaded
let sdk: Promise<Sdk | null> = Promise.resolve(null);

function withSdk(use: (Sentry: Sdk) => void) {
  void sdk.then((Sentry) => {
    if (Sentry) use(Sentry);
  });
}

/** Loads and starts the browser SDK when the page carries a DSN. */
export function initClientErrorTracking() {
  const dsn = readMeta(META.dsn);
  if (!dsn) return;

  // errors thrown while the SDK downloads; its own handlers take over once it starts
  const early: unknown[] = [];
  const onError = (event: ErrorEvent) => early.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => early.push(event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const stopEarly = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };

  sdk = import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        tunnel: TUNNEL,
        environment: readMeta(META.environment),
        release: readMeta(META.release),
        dataCollection: DATA_COLLECTION,
        // no session per page view, and no reports about dropped events
        integrations: (defaults) => defaults.filter(({ name }) => name !== "BrowserSession"),
        sendClientReports: false,
        beforeSend: (event, hint) =>
          shouldReport(hint.originalException) ? scrubEvent(event) : null,
        beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
      });
      stopEarly();
      for (const error of early) if (shouldReport(error)) Sentry.captureException(error);
      return Sentry;
    })
    .catch(() => {
      stopEarly();
      return null;
    });
}

/** For error boundaries; refusals and oRPC errors are skipped. */
export function reportError(error: unknown) {
  if (shouldReport(error)) withSdk((Sentry) => Sentry.captureException(error));
}

/** React's `onUncaughtError`: logs as React would by default, then reports. */
export function reportUncaught(error: unknown, errorInfo: ErrorInfo) {
  console.error(error);
  withSdk((Sentry) => Sentry.reactErrorHandler()(error, errorInfo));
}

/** The internal user id only; `null` on sign-out. */
export function setErrorUser(id: string | null) {
  withSdk((Sentry) => Sentry.setUser(id ? { id } : null));
}
