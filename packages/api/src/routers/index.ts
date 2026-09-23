import type {
  InferRouterCurrentContexts,
  InferRouterInitialContexts,
  InferRouterInputs,
  InferRouterOutputs,
} from "@orpc/server";

import { collectionsRouter } from "./collections";
import { compareRouter } from "./compare";
import { configRouter } from "./config";
import { cosmoLinkRouter } from "./cosmo-link";
import { listRouter } from "./list";
import { lockedObjektsRouter } from "./locked-objekts";
import { marketRouter } from "./market";
import { pinsRouter } from "./pins";
import { profileRouter } from "./profile";
import { statusRouter } from "./status";
import { userRouter } from "./user";

export const router = {
  list: listRouter,
  cosmoLink: cosmoLinkRouter,
  user: userRouter,
  pins: pinsRouter,
  profile: profileRouter,
  lockedObjekt: lockedObjektsRouter,
  config: configRouter,
  compare: compareRouter,
  collections: collectionsRouter,
  market: marketRouter,
  status: statusRouter,
};

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export type InitialContexts = InferRouterInitialContexts<typeof router>;
export type CurrentContexts = InferRouterCurrentContexts<typeof router>;
