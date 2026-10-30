import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import type { LiveSession } from "@repo/cosmo/types/live";
import {
  ParticipantView,
  type StreamVideoParticipant,
  type VideoPlaceholderProps,
} from "@stream-io/video-react-sdk";
import { type PropsWithChildren, type ReactElement, createContext, use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LiveAvatar } from "@/features/live/session-list";
import { m } from "@/paraglide/messages";

/** the viewport minus the chrome around it, so the footer stays on screen: the
 *  nav (h-13 and a 1px border), PageMain's pt-5 and pb-10, the gap-2 and the
 *  footer's two text lines (2.75rem). Both states keep it so the page does not
 *  jump between a live session and an ended one */
const STAGE = "relative flex h-[calc(100svh-10.25rem-1px)] w-full items-center justify-center";

const LiveSessionContext = createContext<LiveSession | null>(null);

export function LiveSessionProvider({ live, children }: PropsWithChildren<{ live: LiveSession }>) {
  return <LiveSessionContext value={live}>{children}</LiveSessionContext>;
}

export function useLiveSession(): LiveSession {
  const live = use(LiveSessionContext);
  if (!live) throw new Error("useLiveSession must be used within LiveSessionProvider");
  return live;
}

function VideoPlaceholder({ style }: VideoPlaceholderProps) {
  const live = useLiveSession();

  return (
    <div className="-z-10 flex size-full items-center justify-center" style={style}>
      <LiveAvatar live={live} className="size-24 outline-4" />
    </div>
  );
}

export function LiveStage({
  participant,
  controls,
}: {
  participant: StreamVideoParticipant;
  controls: ReactElement;
}) {
  return (
    <ParticipantView
      participant={participant}
      PictureInPicturePlaceholder={null}
      VideoPlaceholder={VideoPlaceholder}
      ParticipantViewUI={controls}
      className={`${STAGE} isolate flex-col gap-2 overflow-hidden rounded-lg bg-black [&>video]:size-full [&>video]:object-contain`}
      muteAudio
    />
  );
}

export function LiveStagePending() {
  return (
    <div className={`${STAGE} overflow-hidden rounded-lg bg-black`}>
      <Spinner className="size-6 text-white" />
    </div>
  );
}

export function LiveStageFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={`${STAGE} flex-col gap-3 overflow-hidden rounded-lg bg-black text-white`}>
      <p role="alert" className="text-sm">
        {m.live_join_failed()}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <ArrowClockwiseIcon />
        {m.common_error_retry()}
      </Button>
    </div>
  );
}

export function LiveEnded() {
  const live = useLiveSession();

  return (
    <div className={`${STAGE} flex-col gap-2`}>
      <div className="relative aspect-square size-full overflow-hidden rounded">
        {live.thumbnailImage && (
          <img
            className="absolute size-full object-contain object-center"
            src={live.thumbnailImage}
            alt=""
          />
        )}
      </div>
      <div className="bg-background/50 absolute size-full" />
      {/* `outline` is translucent in dark mode; over a photo it needs an opaque fill */}
      <Badge
        variant="outline"
        size="lg"
        className="dark:bg-background absolute px-2.5 font-semibold"
      >
        {m.live_live_stream_ended()}
      </Badge>
    </div>
  );
}
