import { ORPCError, os } from "@orpc/server";
import { getSession } from "../auth";

const requiredAuthMiddleware = os.middleware(async ({ next, context }) => {
  const session = await getSession();

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: { ...context, session },
  });
});

export const pub = os;

export const authed = pub.use(requiredAuthMiddleware);
