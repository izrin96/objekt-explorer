import { listRouter } from "@/lib/server/api/routers/list";
import { createCallerFactory, createTRPCRouter } from "@/lib/server/api/trpc";
import { cosmoLinkRouter } from "./routers/cosmo-link";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  list: listRouter,
  cosmoLink: cosmoLinkRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
