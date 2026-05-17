import { ORPCError, os } from "@orpc/server";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";

import { auth, type Session } from "../auth.server";
import { parseSelectedArtists } from "../cookie.server";

const requiredAuthMiddleware = os
  .$context<{ session?: Session; headers?: Headers }>()
  .middleware(async ({ next, context }) => {
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

export const selectedArtistsMiddleware = os.middleware(async ({ next, context }) => {
  const artists = await parseSelectedArtists();
  return next({
    context: { ...context, artists },
  });
});

export const pub = os;

export const authed = pub.use(requiredAuthMiddleware);
