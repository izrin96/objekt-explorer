import { ORPCError, os } from "@orpc/server";
import { getSession } from "../auth";
import { parseSelectedArtists } from "../cookie";

const requiredAuthMiddleware = os.middleware(async ({ next, context }) => {
  const session = await getSession();

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: { ...context, session },
  });
});

const selectedArtistsMiddleware = os.middleware(async ({ next, context }) => {
  const artists = await parseSelectedArtists();
  return next({
    context: { ...context, artists },
  });
});

export const pub = os.use(selectedArtistsMiddleware);

export const authed = pub.use(requiredAuthMiddleware);
