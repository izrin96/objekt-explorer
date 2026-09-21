import { createRouter } from "@tanstack/react-router";

import { activityRoute } from "@/routes/activity";
import { resetPasswordRoute, verifiedRoute } from "@/routes/auth";
import { homeRoute } from "@/routes/home";
import { linkRoute } from "@/routes/link";
import { listRoute } from "@/routes/list-detail";
import { listsRoute } from "@/routes/lists";
import { liveRoute } from "@/routes/live";
import { liveDetailRoute } from "@/routes/live-detail";
import { loginRoute } from "@/routes/login";
import { marketRoute } from "@/routes/market";
import {
  collectionRoute,
  profileActivityRoute,
  profileListsRoute,
  profileRoute,
  profileStatsRoute,
  progressRoute,
} from "@/routes/profile";
import { rootRoute } from "@/routes/root";
import { termsPrivacyRoute } from "@/routes/terms-privacy";

const routeTree = rootRoute.addChildren([
  homeRoute,
  marketRoute,
  activityRoute,
  listsRoute,
  listRoute,
  linkRoute,
  liveRoute,
  liveDetailRoute,
  loginRoute,
  resetPasswordRoute,
  verifiedRoute,
  termsPrivacyRoute,
  profileRoute.addChildren([
    collectionRoute,
    profileActivityRoute,
    progressRoute,
    profileStatsRoute,
    profileListsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
