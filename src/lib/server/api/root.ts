import { listRouter } from "@/lib/server/api/routers/list";
import { createCallerFactory, createTRPCRouter } from "@/lib/server/api/trpc";

export const appRouter = createTRPCRouter({
  list: listRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
