import { CornersInIcon, CornersOutIcon, SpeakerHighIcon, UsersIcon } from "@phosphor-icons/react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useCallDuration, useToggleFullScreen } from "@/features/live/hooks";
import { useLiveSession } from "@/features/live/live-stage";
import { LiveAvatar } from "@/features/live/session-list";
import { formatDuration } from "@/lib/time";
import { m } from "@/paraglide/messages";

export function LiveFooter({ children }: PropsWithChildren) {
  const live = useLiveSession();

  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex min-w-0 grow items-center gap-2">
        <LiveAvatar live={live} className="size-10 outline-3" />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <span className="truncate font-semibold">{live.title}</span>
          <span className="truncate text-sm font-semibold">{live.channel.name}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function LiveDuration() {
  const seconds = useCallDuration();

  return <span className="text-sm tabular-nums">{formatDuration(seconds)}</span>;
}

export function ParticipantCounter() {
  const { useParticipantCount } = useCallStateHooks();
  const count = useParticipantCount();

  return (
    <span className="text-destructive-foreground flex items-center gap-1 text-sm font-semibold tabular-nums">
      <UsersIcon size={16} />
      {count}
    </span>
  );
}

export function VolumeControl() {
  const { useParticipants, useSpeakerState } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  const { speaker } = useSpeakerState();

  if (!currentSpeaker) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon-sm" variant="outline" aria-label={m.live_volume_button_aria()} />
        }
      >
        <SpeakerHighIcon />
      </PopoverTrigger>
      <PopoverPopup padding="sm" className="w-auto">
        <Slider
          aria-label={m.live_volume_aria()}
          orientation="vertical"
          min={0}
          max={1}
          step={0.01}
          defaultValue={currentSpeaker.audioVolume ?? 1}
          onValueChange={(value) => {
            if (typeof value === "number")
              speaker.setParticipantVolume(currentSpeaker.sessionId, value);
          }}
          // cnippet sizes a vertical slider on `Slider.Control`, not on the root
          className="h-24 px-1 [&_[data-slot=slider-control]]:min-h-24"
        />
      </PopoverPopup>
    </Popover>
  );
}

export function FullscreenButton() {
  const { isFullscreen, toggle } = useToggleFullScreen();

  return (
    <Button
      size="icon-sm"
      variant="outline"
      aria-label={m.live_fullscreen_aria()}
      onClick={() => void toggle()}
    >
      {isFullscreen ? <CornersInIcon /> : <CornersOutIcon />}
    </Button>
  );
}
