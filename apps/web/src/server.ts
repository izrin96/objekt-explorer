import handler from "@tanstack/react-start/server-entry";

import {
  captureServerError,
  flushErrorTracking,
  initServerErrorTracking,
} from "./lib/server/error-tracking";
import { paraglideMiddleware } from "./paraglide/server.js";

initServerErrorTracking();

function isUnhandled(value: unknown): value is Error {
  return value instanceof Error && (value as { unhandled?: boolean }).unhandled === true;
}

/**
 * When a client disconnects mid-request, Start rethrows the request's
 * `signal.reason` and h3 classifies it as an unhandled error: a `console.error`
 * plus a 500, once per abandoned request. Start calls h3's `toResponse` without
 * a config, so h3's own `silent` / `onError` escape hatches are unreachable —
 * filter at the sink instead. Genuine 500s still surface.
 *
 * @see https://github.com/TanStack/router/issues/7991
 */
function isClientDisconnect(value: Error): boolean {
  const { cause } = value;
  return cause instanceof DOMException && cause.name === "AbortError";
}

// h3 logs each error a server route or SSR left unhandled here, once, so this sink is also
// where they are reported
const logError = console.error.bind(console);
console.error = (...args: Array<unknown>) => {
  const [only] = args;
  if (args.length === 1 && isUnhandled(only)) {
    if (isClientDisconnect(only)) return;
    captureServerError(only.cause instanceof Error ? only.cause : only);
  }
  logError(...args);
};

/** framing, sniffing and referrer rules; a `script-src` policy needs nonces and comes separately */
const SECURITY_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

// copied into a new response: a redirect's headers are immutable
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request) {
    return withSecurityHeaders(await paraglideMiddleware(request, () => handler.fetch(request)));
  },
  // for the production server's shutdown, which loads this bundle
  flush: flushErrorTracking,
};
