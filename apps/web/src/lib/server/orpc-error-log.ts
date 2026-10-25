import { ORPCError, ValidationError } from "@orpc/server";
import type { StandardHandlerInterceptorOptions } from "@orpc/server/standard";
import { isExpectedError } from "@repo/lib/error-scrub";

import { captureServerError } from "./error-tracking";

type HandlerRequest = StandardHandlerInterceptorOptions<object>["request"];

/**
 * Logs a failed procedure call with enough of the request to reproduce it, and reports an
 * unexpected one (a 5xx, never a refusal or bad input) to error tracking.
 */
export function logORPCError(error: unknown, request: HandlerRequest) {
  const where = `${request.method} ${request.url.pathname}`;
  const ua = request.headers["user-agent"];

  if (error instanceof SyntaxError) {
    console.error("ORPC malformed input:", where, {
      data: request.url.searchParams.get("data")?.slice(0, 500),
      contentType: request.headers["content-type"],
      contentLength: request.headers["content-length"],
      ua,
    });
    return;
  }

  if (error instanceof ORPCError && error.cause instanceof ValidationError) {
    console.error("ORPC input validation:", where, {
      issues: error.cause.issues,
      input: error.cause.data,
      ua,
    });
    // input is a 400 and skipped; output validation is a 500, a bug in the procedure
    captureServerError(error, { procedure: request.url.pathname });
    return;
  }

  // Bun rejects the body read when the client disconnects mid-upload
  if (error instanceof DOMException && error.name === "AbortError") {
    console.warn("ORPC client left:", where);
    return;
  }

  // a refusal (a signed-out poll's 401, say) is one line, not a stack with minified source
  if (isExpectedError(error)) {
    const { status, code } = error as ORPCError<string, unknown>;
    console.warn("ORPC refused:", where, status, code);
    return;
  }

  console.error("ORPC error:", where, error, error instanceof ORPCError ? error.cause : "");
  captureServerError(error, { procedure: request.url.pathname });
}
