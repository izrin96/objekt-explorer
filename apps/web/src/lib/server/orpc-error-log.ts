import { ORPCError, ValidationError } from "@orpc/server";
import type { StandardHandlerInterceptorOptions } from "@orpc/server/standard";

type HandlerRequest = StandardHandlerInterceptorOptions<object>["request"];

/** Logs a failed procedure call with enough of the request to reproduce it. */
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
    return;
  }

  console.error("ORPC error:", where, error, error instanceof ORPCError ? error.cause : "");
}
