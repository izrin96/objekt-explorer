import { os } from "@orpc/server";
import { headers } from "next/headers";
import { auth, type Session } from "../auth";

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

export const pub = os;

export const authed = pub.use(requiredAuthMiddleware);
