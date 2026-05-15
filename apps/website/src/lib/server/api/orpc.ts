import { os } from "@orpc/server";
import { getRequestHeaders, getRequestUrl } from "@tanstack/react-start/server";

import { auth, type Session } from "../auth.server";
import { parseSelectedArtists } from "../cookie.server";
import { getUserLocale } from "../locale.server";

const requiredAuthMiddleware = os
  .$context<{ session?: Session; headers?: Headers }>()
  .middleware(async ({ next, context }) => {
    const headers = context.headers ?? getRequestHeaders();

    const session =
      context.session ??
      (await auth.api.getSession({
        headers,
      }));

    if (!session?.user) {
      const url = getRequestUrl();
      console.info("[debug]", url.pathname);
      throw new Error("UNAUTHORIZED");
    }

    return next({
      context: { session, headers },
    });
  });

export const localeMiddleware = os.middleware(async ({ next, context }) => {
  const locale = await getUserLocale();
  return next({
    context: { ...context, locale },
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
