import { ORPCError, os } from "@orpc/server";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";

import { isStaffRole, roleList } from "./schemas/moderation";
import { auth } from "./services/account/auth";

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

/**
 * NOT_FOUND for everyone else, signed out included, so the staff area's existence is not
 * confirmed.
 */
export const moderator = optionalAuthed.use(async ({ next, context }) => {
  const { session } = context;
  if (!session || !isStaffRole(session.user.role)) throw new ORPCError("NOT_FOUND");
  return next({
    context: { ...context, session, isAdmin: roleList(session.user.role).includes("admin") },
  });
});

/**
 * Admins only. A moderator already knows the staff area exists, so FORBIDDEN tells them nothing
 * new; everyone else still gets `moderator`'s NOT_FOUND.
 */
export const adminOnly = moderator.use(async ({ next, context }) => {
  if (!context.isAdmin) throw new ORPCError("FORBIDDEN");
  return next();
});
