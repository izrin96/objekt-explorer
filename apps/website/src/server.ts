import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "./paraglide/server.js";

/**
 * When a client disconnects mid-request, Start rethrows the request's
 * `signal.reason` and h3 classifies it as an unhandled error: a `console.error`
 * plus a 500, once per abandoned request. Start calls h3's `toResponse` without
 * a config, so h3's own `silent`/`onError` escape hatches are unreachable.
 *
 * Filter the log at the sink instead. Genuine 500s still surface.
 *
 * @see https://github.com/TanStack/router/issues/7991
 */
function isClientDisconnect(value: unknown): boolean {
  if (!(value instanceof Error)) return false;
  if ((value as { unhandled?: boolean }).unhandled !== true) return false;
  const { cause } = value;
  return cause instanceof DOMException && cause.name === "AbortError";
}

const logError = console.error.bind(console);
console.error = (...args: Array<unknown>) => {
  if (args.length === 1 && isClientDisconnect(args[0])) return;
  logError(...args);
};

export default {
  fetch(request: Request) {
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
