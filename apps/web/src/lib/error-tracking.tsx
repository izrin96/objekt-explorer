import {
  DATA_COLLECTION,
  isExpectedError,
  scrubBreadcrumb,
  scrubEvent,
} from "@repo/lib/error-scrub";
import type { ErrorInfo } from "react";

import { isFromServer } from "@/lib/orpc-error";
import type * as SentryClient from "@/lib/sentry-client";

export type ErrorTrackingConfig = {
  dsn: string;
  environment: string | null;
  release: string | null;
};

// a type only: the SDK itself is imported on demand
type Sdk = typeof SentryClient;

/** Same-origin route that forwards envelopes to Sentry, whose own host ad blockers drop. */
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

// what Safari, Chrome and Firefox name a fetch that got no response
const NETWORK_FAILURE = new Set([
  "Load failed",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
]);

/** A request cut off before or during its response (offline, app backgrounded, navigation): not our bug. */
function isNetworkFailure(error: unknown, depth = 0): boolean {
  if (error instanceof TypeError) return NETWORK_FAILURE.has(error.message);
  if (!(error instanceof Error) || depth > 4) return false;
  // ofetch's FetchError keeps the browser's TypeError as its cause
  if (error.name === "FetchError") {
    return (
      (error as { response?: unknown }).response === undefined &&
      isNetworkFailure(error.cause, depth + 1)
    );
  }
  // oRPC wraps a body cut off mid-read in "Cannot parse response body" (WEB-13)
  return (
    error.message.startsWith("Cannot parse response body") &&
    isNetworkFailure(error.cause, depth + 1)
  );
}

// what Chrome, Safari and Firefox name an `import()` whose chunk is gone, mostly after a deploy
const CHUNK_FAILURE = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
];

function isChunkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError && CHUNK_FAILURE.some((prefix) => error.message.startsWith(prefix))
  );
}

/**
 * Reported from the browser: not a refusal, not any oRPC error, not an error SSR or a server
 * function sent over, since the server reported those itself, and not a dropped connection or a
 * stale chunk.
 */
function shouldReport(error: unknown) {
  if (reloading) return false;
  if (isExpectedError(error) || isFromServer(error)) return false;
  if (isNetworkFailure(error) || isChunkFailure(error)) return false;
  // a request we cancelled, as React Query does when the last component reading a query unmounts
  if (error instanceof Error && error.name === "AbortError") return false;
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

  sdk = import("@/lib/sentry-client")
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
        // only errors thrown in our chunks: Chrome on iOS injects scripts whose errors carry the
        // page's URL as their file, and analytics loads from /m/s
        allowUrls: [/\/assets\/[^/?#]+\.js/],
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

let reloading = false;

/**
 * Called before reloading for a missing chunk. Vite resolves that import to `undefined` once its
 * `vite:preloadError` is prevented, so the router throws reading the module until the page goes.
 */
export function stopReportingForReload() {
  reloading = true;
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

/**
 * React's `onRecoverableError`: hands the error on as React would by default, except a router
 * error from a route the user just left. The router clears that route's match before React
 * unmounts it, so its hooks throw once ("Invariant failed", or `<Outlet>` reading `_notFound` of
 * the missing match) and React recovers (TanStack/router#8198).
 */
export function reportRecoverable(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  if (
    cause instanceof Error &&
    (cause.message === "Invariant failed" ||
      (cause instanceof TypeError && cause.message.includes("_notFound")))
  ) {
    console.warn(error);
    return;
  }
  if (typeof globalThis.reportError === "function") globalThis.reportError(error);
  else console.error(error);
}

/** The internal user id only; `null` on sign-out. */
export function setErrorUser(id: string | null) {
  withSdk((Sentry) => Sentry.setUser(id ? { id } : null));
}
