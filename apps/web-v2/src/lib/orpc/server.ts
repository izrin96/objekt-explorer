import type {
  InferRouterCurrentContexts,
  InferRouterInitialContexts,
  InferRouterInputs,
  InferRouterOutputs,
} from "@orpc/server";
import type { router } from "../server/api/routers";

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export type InitialContexts = InferRouterInitialContexts<typeof router>;
export type CurrentContexts = InferRouterCurrentContexts<typeof router>;
