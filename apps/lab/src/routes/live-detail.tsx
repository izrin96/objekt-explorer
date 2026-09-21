import { LinkBreakIcon } from "@phosphor-icons/react";
import { createRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LiveFooter } from "@/components/live/live-footer";
import { LiveEnded, LiveStage } from "@/components/live/live-stage";
import type { LabLiveSession } from "@/fixtures/live";
import { liveById } from "@/fixtures/live";
import { rootRoute } from "@/routes/root";

/**
 * Port of `routes/(container)/live/$id.tsx`. The app loads the session from
 * Cosmo and 404s on a miss; the lab's fixture map is the same answer without a
 * loader.
 */
function LiveDetail() {
  const { id } = liveDetailRoute.useParams();
  const live = liveById.get(id);

  if (!live) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
        <LinkBreakIcon size={72} weight="thin" />
        Live not found
      </div>
    );
  }

  return <LiveView key={live.id} live={live} />;
}

function LiveView({ live }: { live: LabLiveSession }) {
  // the footer's fullscreen button targets the stage, so the element has to be
  // state and not a ref — it mounts below the footer's first render
  const [stage, setStage] = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative flex flex-col gap-2">
      {live.endedAt === null ? (
        <LiveStage live={live} stageRef={setStage} />
      ) : (
        <LiveEnded live={live} />
      )}
      <LiveFooter live={live} stage={stage} />
    </div>
  );
}

export const liveDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/live/$id",
  component: LiveDetail,
});
