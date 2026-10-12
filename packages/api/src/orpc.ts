import { ORPCError, os } from "@orpc/server";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";

import { isStaffRole, roleList } from "./schemas/moderation";
import { auth } from "./services/auth";

const base = os.$context<{ headers?: Headers }>();

const requiredAuthMiddleware = base.middleware(async ({ next, context }) => {
  const headers = context.headers ?? getRequestHeaders();

  const session = await auth.api.getSession({
    headers,
    returnHeaders: true,
  });

  if (!session.response) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const cookies = session.headers.getSetCookie();
  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return next({
    context: { ...context, session: session.response },
  });
});

const optionalAuthMiddleware = base.middleware(async ({ next, context }) => {
  const headers = context.headers ?? getRequestHeaders();

  const session = await auth.api.getSession({
    headers,
    returnHeaders: true,
  });

  const cookies = session.headers.getSetCookie();
  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return next({
    context: { ...context, session: session.response },
  });
});

export const pub = base;

export const authed = pub.use(requiredAuthMiddleware);

export const optionalAuthed = pub.use(optionalAuthMiddleware);

/** NOT_FOUND for everyone else, so the console's existence is not confirmed. */
export const moderator = authed.use(async ({ next, context }) => {
  const { role } = context.session.user;
  if (!isStaffRole(role)) throw new ORPCError("NOT_FOUND");
  return next({ context: { ...context, isAdmin: roleList(role).includes("admin") } });
});
