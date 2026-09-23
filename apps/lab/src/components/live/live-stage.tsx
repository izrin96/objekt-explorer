import { useState } from "react";

import { LiveAvatar } from "@/components/live/session-list";
import { Button } from "@/components/ui/button";
import type { LabLiveSession } from "@/fixtures/live";

/**
 * The stage is `h-[calc(100svh-7rem)]` in the app — the viewport minus the nav
 * and the footer under it — and both states keep that height so the page does
 * not jump between a live session and an ended one.
 */
const STAGE = "relative flex h-[calc(100svh-7rem)] w-full items-center justify-center";

/**
 * Port of `live/custom-player.tsx`'s `CustomLivestreamLayout` for a lab with no
 * stream: `CustomVideoPlaceholder` — the app's own "video track is off" state —
 * is all there is to render, so it is the whole stage rather than a fallback
 * behind one. No royalty-free clip is referenced: the fixtures are offline and
 * a remote mp4 would be the one network call this page makes.
 *
 * The `Unmute` overlay is the app's, and it is the real contract: audio stays
 * off until the viewer asks for it.
 */
export function LiveStage({
  live,
  stageRef,
}: {
  live: LabLiveSession;
  stageRef: (el: HTMLDivElement | null) => void;
}) {
  const [unmuted, setUnmuted] = useState(false);

  return (
    <div ref={stageRef} className={`${STAGE} overflow-hidden rounded-lg bg-black`}>
      {/* the app outlines the placeholder avatar at 4px in the channel colour */}
      <LiveAvatar session={live} className="size-24 outline-4" />
      {!unmuted && (
        <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
          <Button onClick={() => setUnmuted(true)}>Unmute</Button>
        </div>
      )}
    </div>
  );
}

/** Port of `live/live-ended.tsx`: the thumbnail under a veil, one line over it. */
export function LiveEnded({ live }: { live: LabLiveSession }) {
  return (
    <div className={`${STAGE} flex-col gap-2`}>
      <div className="relative aspect-square size-full overflow-hidden rounded">
        <img
          className="absolute size-full object-contain object-center"
          src={live.thumbnailImage}
          alt={live.title}
        />
      </div>
      <div className="bg-background/50 absolute size-full" />
      <div className="text-foreground absolute flex justify-center font-semibold">
        Live stream ended
      </div>
    </div>
  );
}
