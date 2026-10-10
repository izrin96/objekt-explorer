import { ORPCError } from "@orpc/client";

export const isNotFound = (error: unknown) =>
  error instanceof ORPCError && error.code === "NOT_FOUND";

/** `data.reason` and `data.retryAt` of a refused oRPC call; both null for any other error. */
export function errorReason(error: unknown) {
  if (!(error instanceof ORPCError)) return { reason: null, retryAt: null };
  const data = error.data as { reason?: unknown; retryAt?: unknown } | undefined;
  return {
    reason: typeof data?.reason === "string" ? data.reason : null,
    retryAt: typeof data?.retryAt === "string" ? data.retryAt : null,
  };
}

export const isUnauthorized = (error: unknown) =>
  error instanceof ORPCError && error.code === "UNAUTHORIZED";
