import {
  CornersInIcon,
  CornersOutIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { type PropsWithChildren, useId } from "react";

import { Button } from "@/components/ui/button";
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
          <h1 className="font-display truncate font-semibold">{live.title}</h1>
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
    <span className="text-muted-foreground flex items-center gap-1 text-sm tabular-nums">
      <UsersIcon size={16} />
      {count}
    </span>
  );
}

export function VolumeControl({
  audioOn,
  onAudioOnChange,
}: {
  audioOn: boolean;
  onAudioOnChange: (on: boolean) => void;
}) {
  const { useParticipants, useSpeakerState } = useCallStateHooks();
  const [currentSpeaker] = useParticipants();
  // call-wide, not per participant: the broadcaster's entry is replaced when
  // they rejoin, and a volume stored on it would fall back to full
  const { speaker, volume } = useSpeakerState();
  const labelId = useId();

  if (!currentSpeaker) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={audioOn ? m.live_mute() : m.live_unmute()}
        onClick={() => onAudioOnChange(!audioOn)}
      >
        {audioOn ? <SpeakerHighIcon /> : <SpeakerSlashIcon />}
      </Button>
      <span id={labelId} className="sr-only">
        {m.live_volume_aria()}
      </span>
      {/* phones set the volume with their own buttons, and iOS ignores a page's */}
      <Slider
        // the vendored Slider renders its own thumb, and only `aria-labelledby`
        // on the root reaches the thumb's input
        aria-labelledby={labelId}
        min={0}
        max={1}
        step={0.01}
        defaultValue={volume}
        onValueChange={(value) => {
          if (typeof value !== "number") return;
          speaker.setVolume(value);
          if (!audioOn) onAudioOnChange(true);
        }}
        // cnippet gives a horizontal `Slider.Control` a min-w-44
        className="hidden w-20 sm:flex [&_[data-slot=slider-control]]:min-w-20"
      />
    </div>
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
