import type {
  InferRouterCurrentContexts,
  InferRouterInitialContexts,
  InferRouterInputs,
  InferRouterOutputs,
} from "@orpc/server";

import { activityRouter } from "./activity";
import { chatRouter } from "./chat";
import { collectionsRouter } from "./collections";
import { compareRouter } from "./compare";
import { configRouter } from "./config";
import { cosmoLinkRouter } from "./cosmo-link";
import { listRouter } from "./list";
import { liveRouter } from "./live";
import { lockedObjektsRouter } from "./locked-objekts";
import { marketRouter } from "./market";
import { moderationRouter } from "./moderation";
import { notificationsRouter } from "./notifications";
import { objektsRouter } from "./objekts";
import { offerRouter } from "./offer";
import { pinsRouter } from "./pins";
import { profileRouter } from "./profile";
import { statusRouter } from "./status";
import { tradeRouter } from "./trade";
import { transfersRouter } from "./transfers";
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
  activity: activityRouter,
  objekts: objektsRouter,
  transfers: transfersRouter,
  live: liveRouter,
  trade: tradeRouter,
  notifications: notificationsRouter,
  chat: chatRouter,
  moderation: moderationRouter,
  offer: offerRouter,
};

/** What `/api/v1` serves and documents; everything else stays RPC-only. */
export const openApiRouter = {
  activity: activityRouter,
  collections: collectionsRouter,
  objekts: objektsRouter,
  transfers: transfersRouter,
  user: { search: userRouter.search },
  live: liveRouter,
  market: marketRouter,
  profiles: {
    preview: profileRouter.preview,
    pins: pinsRouter.list,
    lockedObjekts: lockedObjektsRouter.list,
    lists: listRouter.profileLists,
  },
  status: statusRouter,
  list: {
    findPublic: listRouter.findPublic,
    listEntries: listRouter.listEntries,
    export: listRouter.export,
  },
  config: { getArtists: configRouter.getArtists, getFilterData: configRouter.getFilterData },
};

export type Inputs = InferRouterInputs<typeof router>;
export type Outputs = InferRouterOutputs<typeof router>;
export type InitialContexts = InferRouterInitialContexts<typeof router>;
export type CurrentContexts = InferRouterCurrentContexts<typeof router>;
