import { os } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth, type Session } from "../auth.server";

const requiredAuthMiddleware = os
  .$context<{ session?: Session; headers?: Headers }>()
  .middleware(async ({ next, context }) => {
    const heads = context.headers ?? getRequestHeaders();

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

export const pub = os;

export const authed = pub.use(requiredAuthMiddleware);
