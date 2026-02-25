import { configRouter } from "./config";
import { cosmoLinkRouter } from "./cosmo-link";
import { listRouter } from "./list";
import { lockedObjektsRouter } from "./locked-objekts";
import { metaRouter } from "./meta";
import { pinsRouter } from "./pins";
import { profileRouter } from "./profile";
import { userRouter } from "./user";

export const router = {
  list: listRouter,
  cosmoLink: cosmoLinkRouter,
  user: userRouter,
  pins: pinsRouter,
  profile: profileRouter,
  lockedObjekt: lockedObjektsRouter,
  config: configRouter,
  meta: metaRouter,
};
