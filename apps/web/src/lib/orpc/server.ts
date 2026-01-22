"server only";

import {
  createRouterClient,
  type InferRouterCurrentContexts,
  type InferRouterInitialContexts,
  type InferRouterInputs,
  type InferRouterOutputs,
} from "@orpc/server";
import { headers } from "next/headers";

import { router } from "../server/api/routers";

globalThis.$client = createRouterClient(router, {
  context: async () => ({
    headers: await headers(),
  }),
});

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export type InitialContexts = InferRouterInitialContexts<typeof router>;
export type CurrentContexts = InferRouterCurrentContexts<typeof router>;
