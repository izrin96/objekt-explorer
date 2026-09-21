import { ORPCError, os } from "@orpc/server";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";

import { auth } from "./services/auth";
import { parseSelectedArtists } from "./services/cookie";

export type ApiErrorKey =
  | "compare_source_list_not_found"
  | "compare_target_profile_not_found"
  | "compare_target_list_not_found"
  | "cosmo_link_already_linked_self"
  | "cosmo_link_already_linked_other"
  | "cosmo_link_rate_limit"
  | "cosmo_link_verification_expired"
  | "cosmo_link_profile_mismatch"
  | "cosmo_link_code_not_found"
  | "profile_not_linked"
  | "profile_not_found"
  | "user_not_linked_provider"
  | "user_failed_get_info";

export type ApiMessages = Record<Exclude<ApiErrorKey, "user_failed_get_info">, () => string> & {
  user_failed_get_info: (inputs: { provider: string }) => string;
};

const base = os.$context<{ headers?: Headers; messages: ApiMessages }>();

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

export const selectedArtistsMiddleware = os.middleware(async ({ next, context }) => {
  const artists = await parseSelectedArtists();
  return next({
    context: { ...context, artists },
  });
});

export const pub = base;

export const authed = pub.use(requiredAuthMiddleware);

export const optionalAuthed = pub.use(optionalAuthMiddleware);
