import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

import { getSession } from "./auth.server";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  const session = await getSession();
  if (!session) throw redirect({ to: "/login" });
  return next({ context: { session } });
});

export const optionalAuth = createMiddleware().server(async ({ next }) => {
  const session = await getSession();
  return next({ context: { session } });
});
