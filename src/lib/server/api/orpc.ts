import { os } from "@orpc/server";
import { headers } from "next/headers";
import { auth, type Session } from "../auth";
import { parseSelectedArtists } from "../cookie";

const requiredAuthMiddleware = os
  .$context<{ session?: Session; headers?: Headers }>()
  .middleware(async ({ next, context }) => {
    const heads = context.headers ?? (await headers());

    const session =
      context.session ??
      (await auth.api.getSession({
        headers: heads,
      }));

    if (!session?.user) {
      throw new Error("UNAUTHORIZED");
    }

    return next({
      context: { session, headers: heads },
    });
  });

const selectedArtistsMiddleware = os.middleware(async ({ next }) => {
  const artists = await parseSelectedArtists();
  return next({
    context: { artists },
  });
});

export const pub = os.use(selectedArtistsMiddleware);

export const authed = pub.use(requiredAuthMiddleware);
