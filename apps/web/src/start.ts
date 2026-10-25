import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { orpcErrorAdapter, serverErrorAdapter } from "@/lib/orpc-error";
import { captureServerError } from "@/lib/server/error-tracking";

// with a start.ts, Start no longer adds its server-function CSRF check on its own; this is the
// same middleware with the same filter it used
const csrfMiddleware = createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" });

// a server function's error reaches the browser as a bare message, so it is reported here
const reportServerFnErrors = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (!isRedirect(error) && !isNotFound(error)) captureServerError(error);
    throw error;
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [reportServerFnErrors],
  // the oRPC one first: both match an ORPCError
  serializationAdapters: [orpcErrorAdapter, serverErrorAdapter],
}));
