import { listRouter } from "@/lib/server/api/routers/list";
import { createCallerFactory, createTRPCRouter } from "@/lib/server/api/trpc";
import { cosmoLinkRouter } from "./routers/cosmo-link";
import { pinsRouter } from "./routers/pins";
import { profileRouter } from "./routers/profile";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  list: listRouter,
  cosmoLink: cosmoLinkRouter,
  user: userRouter,
  pins: pinsRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
