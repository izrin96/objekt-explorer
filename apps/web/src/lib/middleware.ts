import { getSession } from "@repo/api/services/auth";
import { createMiddleware } from "@tanstack/react-start";

export const optionalAuth = createMiddleware().server(async ({ next }) => {
  const session = await getSession();
  return next({ context: { session } });
});
