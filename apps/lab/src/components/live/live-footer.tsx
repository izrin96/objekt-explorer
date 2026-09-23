import { CornersInIcon, CornersOutIcon, SpeakerHighIcon, UsersIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { LiveAvatar } from "@/components/live/session-list";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { LabLiveSession } from "@/fixtures/live";
import { hash } from "@/lib/seeded";
import { formatDuration } from "@/lib/time";

/**
 * Port of `live/live-footer.tsx` plus the controls `custom-player.tsx` portals
 * into it. The app only mounts the controls while the call is live — an ended
 * session renders the bare identity row — so `stage` doubles as that switch:
 * it is the element fullscreen targets, and it is only handed over by the live
 * stage.
 */
export function LiveFooter({
  live,
  stage,
}: {
  live: LabLiveSession;
  stage?: HTMLDivElement | null;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex min-w-0 grow items-center gap-2">
        <LiveAvatar session={live} className="size-10 outline-3" />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <span className="truncate font-semibold">{live.title}</span>
          <span className="truncate text-sm font-semibold">{live.channel.name}</span>
        </div>
      </div>
      {live.endedAt === null && (
        <div className="flex shrink-0 items-center gap-2">
          <LiveDuration startedAt={live.startedAt} />
          <ParticipantCounter id={live.id} />
          <VolumeControl />
          <FullscreenButton stage={stage ?? null} />
        </div>
      )}
    </div>
  );
}

function elapsedSeconds(startedAt: Date): number {
  return Math.floor((Date.now() - startedAt.getTime()) / 1000);
}

/** `useUpdateCallDuration`: one second at a time, from the session's start */
function LiveDuration({ startedAt }: { startedAt: Date }) {
  const [seconds, setSeconds] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    // read the clock rather than incrementing, so a backgrounded tab catches up
    const id = setInterval(() => setSeconds(elapsedSeconds(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <span className="text-sm tabular-nums">{formatDuration(seconds)}</span>;
}

/**
 * `live/live-counter.tsx`. The app reads Stream's participant count; the lab
 * seeds it off the session id and drifts it, because a number that never moves
 * is the one thing a viewer count cannot be.
 *
 * The app writes `text-red-400`, a raw Tailwind colour with no token behind it.
 * `text-destructive` is the nearest canonical name and reads the same on both
 * themes; noted so the port is not mistaken for the app's own class.
 */
function ParticipantCounter({ id }: { id: string }) {
  const [count, setCount] = useState(() => 120 + (hash(id) % 880));

  useEffect(() => {
    const drift = setInterval(() => {
      setCount((current) => {
        const step = 1 + Math.floor(Math.random() * 3);
        return Math.max(1, current + (Math.random() < 0.5 ? -step : step));
      });
    }, 2500);
    return () => clearInterval(drift);
  }, []);

  return (
    <span className="text-destructive flex items-center gap-1 text-sm font-semibold tabular-nums">
      <UsersIcon size={16} />
      {count}
    </span>
  );
}

/**
 * `LiveVolumeControl`. There is no audio track to attach it to, so the slider
 * only holds its own position — the control is the port, the effect is not
 * something the lab can fake.
 *
 * cnippet puts the vertical sizing on `Slider.Control`
 * (`data-[orientation=vertical]:min-h-44`), not on the root the `className`
 * lands on, so the app's `min-h-24` has to reach through to that slot — the
 * same wrapper trap as the popover's padding.
 */
function VolumeControl() {
  const [volume, setVolume] = useState(1);

  return (
    <Popover>
      <PopoverTrigger render={<Button size="icon-sm" variant="outline" aria-label="Volume" />}>
        <SpeakerHighIcon />
      </PopoverTrigger>
      <PopoverPopup padding="sm" className="w-auto">
        <Slider
          aria-label="Volume"
          orientation="vertical"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onValueChange={(value) => {
            if (typeof value === "number") setVolume(value);
          }}
          className="h-24 px-1 [&_[data-slot=slider-control]]:min-h-24"
        />
      </PopoverPopup>
    </Popover>
  );
}

/** `useToggleFullScreen`, minus the iOS native-player branch the lab has no way to reach */
function FullscreenButton({ stage }: { stage: HTMLDivElement | null }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <Button
      size="icon-sm"
      variant="outline"
      aria-label="Fullscreen"
      onClick={() => {
        if (document.fullscreenElement !== null) void document.exitFullscreen();
        else void stage?.requestFullscreen();
      }}
    >
      {isFullscreen ? <CornersInIcon /> : <CornersOutIcon />}
    </Button>
  );
}
