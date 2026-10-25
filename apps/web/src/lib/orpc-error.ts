import { ORPCError } from "@orpc/client";
import { createSerializationAdapter } from "@tanstack/react-router";

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

// `data` as the JSON it already travels as over /rpc
type SerializedORPCError = { code: string; status: number; message: string; data: string | null };

/** A value JSON can't hold (a BigInt, a cycle) is dropped rather than failing the render. */
function serializeData(data: unknown) {
  if (data === undefined) return null;
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

/**
 * Keeps an oRPC error whole across SSR hydration, so a route's error boundary can still tell a
 * refusal (`data.reason`, a status under 500) from a failure. Start's default keeps only `message`.
 */
export const orpcErrorAdapter = createSerializationAdapter({
  key: "orpc-error",
  test: (value): value is ORPCError<string, unknown> => value instanceof ORPCError,
  toSerializable: (error): SerializedORPCError => ({
    code: error.code,
    status: error.status,
    message: error.message,
    data: serializeData(error.data),
  }),
  fromSerializable: (value: SerializedORPCError) =>
    new ORPCError(value.code, {
      status: value.status,
      message: value.message,
      data: value.data === null ? undefined : (JSON.parse(value.data) as unknown),
    }),
});

/** What the browser gets in place of a server error's own message. */
export const SERVER_ERROR_MESSAGE = "Something went wrong on the server";

/**
 * Any other error thrown on the server and sent to the browser by SSR or a server function. It
 * sends a fixed message, not the error's own: a failed query's message carries its SQL and bound
 * values. It marks the copy, since the server reported it.
 */
export const serverErrorAdapter = createSerializationAdapter({
  key: "server-error",
  test: (value): value is Error => value instanceof Error,
  toSerializable: () => ({ message: SERVER_ERROR_MESSAGE }),
  fromSerializable: ({ message }: { message: string }) =>
    Object.assign(new Error(message), { fromServer: true }),
});

/** An error the server threw and already reported (`serverErrorAdapter`). */
export const isFromServer = (error: unknown) =>
  error instanceof Error && (error as { fromServer?: unknown }).fromServer === true;
