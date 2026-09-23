import { createRoute } from "@tanstack/react-router";

import { LiveSessionList } from "@/components/live/session-list";
import { Note } from "@/components/shared/note";
import { rootRoute } from "@/routes/root";

/** `live_tos_notice` in `apps/website/messages/en.json`, verbatim */
export const LIVE_TOS_NOTICE =
  "As this feature violates Cosmo's Terms of Service, we will no longer continue offering it. Please watch the live stream on the Cosmo app instead.";

/**
 * Port of `routes/(container)/live/index.tsx`. The app gates the list behind a
 * `?token=` bypass and shows the notice on its own to everyone else; the lab
 * has no token, so it always renders the list — but the notice stays verbatim
 * and first, because it is the honest state of the feature.
 *
 * Not linked from `AppNav`, matching `apps/website`, whose navbar does not
 * mention `/live` either: reachable by URL only.
 */
function LivePage() {
  return (
    <div className="flex flex-col gap-3 pb-24">
      <Note>{LIVE_TOS_NOTICE}</Note>
      <LiveSessionList />
    </div>
  );
}

export const liveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/live",
  component: LivePage,
});
