"server only";

import {
  createRouterClient,
  type InferRouterCurrentContexts,
  type InferRouterInitialContexts,
  type InferRouterInputs,
  type InferRouterOutputs,
} from "@orpc/server";
import { getRequest } from "@tanstack/react-start/server";

import { router } from "../server/api/routers";

createRouterClient(router, {
  context: async () => {
    const request = getRequest();
    return {
      headers: request.headers,
    };
  },
});

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export type InitialContexts = InferRouterInitialContexts<typeof router>;
export type CurrentContexts = InferRouterCurrentContexts<typeof router>;
