import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import { type AppRouter, createCaller } from "@/lib/server/api/root";
import { createTRPCContext } from "@/lib/server/api/trpc";
import { getQueryClient } from "../query-client";

const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

export const cachedGetQueryClient = cache(getQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  cachedGetQueryClient,
);
