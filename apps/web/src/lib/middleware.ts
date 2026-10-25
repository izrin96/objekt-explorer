import { getSession } from "@repo/api/services/session";
import { createMiddleware } from "@tanstack/react-start";

export const optionalAuth = createMiddleware().server(async ({ next }) => {
  const session = await getSession();
  return next({ context: { session } });
});
