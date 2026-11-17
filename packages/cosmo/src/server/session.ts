import { objektSummariesSchema, sessionUserSchema } from "../session-parse";
import { cosmoSessionApi, cosmoShop, guard, parseBody, sessionCookieHeader } from "./shop";

/** `nickname` and `address` of the cookie's owner; the rest of `users/me` is dropped. */
export async function fetchSessionUser(cookie: string) {
  const data = await guard(true, () =>
    cosmoSessionApi("/bff/v4/users/me", { headers: sessionCookieHeader(cookie) }),
  );
  return parseBody(sessionUserSchema, data);
}

/** Ends the session at Cosmo. */
export async function logoutSession(cookie: string) {
  await guard(true, () =>
    cosmoShop("/bff/v3/users/logout-from-session", {
      method: "POST",
      headers: sessionCookieHeader(cookie),
      responseType: "text",
    }),
  );
}

/**
 * One page of the signer's own collections. No retry: the worker's backoff decides when to try
 * again, so one call is one request against its budget.
 */
export async function fetchObjektSummaries(
  cookie: string,
  params: { artistId: string; page: number; size?: number; className?: string },
) {
  const data = await guard(true, () =>
    cosmoSessionApi("/bff/v3/objekt-summaries", {
      headers: sessionCookieHeader(cookie),
      query: {
        artistId: params.artistId,
        "class[]": params.className,
        order: "newest",
        page: params.page,
        size: params.size ?? 30,
      },
    }),
  );
  return parseBody(objektSummariesSchema, data);
}
