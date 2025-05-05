import { listRouter } from "@/lib/server/api/routers/list";
import { createCallerFactory, createTRPCRouter } from "@/lib/server/api/trpc";
import { cosmoClaimRouter } from "./routers/cosmo-claim";

export const appRouter = createTRPCRouter({
  list: listRouter,
  cosmoClaim: cosmoClaimRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
