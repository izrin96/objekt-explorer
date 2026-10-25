import handler from "@tanstack/react-start/server-entry";

import {
  captureServerError,
  flushErrorTracking,
  initServerErrorTracking,
} from "./lib/server/error-tracking";
import { paraglideMiddleware } from "./paraglide/server.js";

initServerErrorTracking();

/**
 * When a client disconnects mid-request, reading its body rejects with Bun's AbortError and Start
 * logs that as an unhandled error: a `console.error` plus a 500, once per abandoned request. Start
 * offers no hook to silence it, so it is filtered at the sink. Genuine 500s still surface.
 *
 * @see https://github.com/TanStack/router/issues/7991
 */
function isClientDisconnect(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError";
}

// Start logs each error a server route or SSR left unhandled here, alone and unwrapped, so this
// sink is also where they are reported
const logError = console.error.bind(console);
console.error = (...args: Array<unknown>) => {
  const [only] = args;
  if (args.length === 1 && only instanceof Error) {
    if (isClientDisconnect(only)) return;
    captureServerError(only);
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
