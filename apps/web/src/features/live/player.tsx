import { SpeakerSlashIcon } from "@phosphor-icons/react";
import type { LiveSession } from "@repo/cosmo/types/live";
import {
  Audio,
  type Call,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  hasAudio,
  useCallStateHooks,
  useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  FullscreenButton,
  LiveDuration,
  LiveFooter,
  ParticipantCounter,
  VolumeControl,
} from "@/features/live/live-footer";
import {
  LiveEnded,
  LiveSessionProvider,
  LiveStage,
  LiveStageFailed,
  LiveStagePending,
} from "@/features/live/live-stage";
import { clientEnv } from "@/lib/env/client";
import { m } from "@/paraglide/messages";

const videoClient = new StreamVideoClient({
  apiKey: clientEnv.VITE_LIVE_API_KEY,
  user: { type: "anonymous" },
});

const route = getRouteApi("/(container)/live/$id");

export default function LiveDetailPage() {
  const { live } = route.useLoaderData();

  return <LivePlayer live={live} />;
}

function LivePlayer({ live }: { live: LiveSession }) {
  return (
    <LiveSessionProvider live={live}>
      <StreamVideo client={videoClient}>
        <div className="relative flex flex-col gap-2">
          {live.endedAt === null ? (
            <LivestreamCall key={live.videoCallId} callId={live.videoCallId} />
          ) : (
            <>
              <LiveEnded />
              <LiveFooter />
            </>
          )}
        </div>
      </StreamVideo>
    </LiveSessionProvider>
  );
}

function LivestreamCall({ callId }: { callId: string }) {
  const streamClient = useStreamVideoClient();
  const [attempt, setAttempt] = useState(0);
  const [joined, setJoined] = useState<{ attempt: number; call: Call } | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);

  // `join` is single-flight: on one Call, StrictMode's second run would get the
  // first run's join back, which that run's `leave` then cancels, leaving the
  // call left. Every run, and every retry, gets its own Call
  useEffect(() => {
    if (!streamClient) return;
    const call = streamClient.call("livestream", callId);
    let cancelled = false;
    call.setPreferredIncomingVideoResolution({ width: 1080, height: 1920 });
    call
      .join()
      .then(() => {
        if (!cancelled) setJoined({ attempt, call });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to join call", error);
        setFailedAttempt(attempt);
      });
    return () => {
      cancelled = true;
      call.leave().catch((error: unknown) => console.error("Failed to leave call", error));
    };
  }, [streamClient, callId, attempt]);

  if (failedAttempt === attempt) {
    return (
      <>
        <LiveStageFailed onRetry={() => setAttempt((n) => n + 1)} />
        <LiveFooter />
      </>
    );
  }

  const call = joined?.attempt === attempt ? joined.call : null;
  if (!call) {
    return (
      <>
        <LiveStagePending />
        <LiveFooter />
      </>
    );
  }

  return (
    <StreamCall call={call}>
      <LivestreamLayout />
    </StreamCall>
  );
}

function LivestreamLayout() {
  const { useParticipants, useCallEndedAt } = useCallStateHooks();
  const endedAt = useCallEndedAt();
  const [speaker] = useParticipants();
  // "blocked" until the first click: browsers hold audio back until the page
  // has been interacted with, so the stage asks once and the footer toggles after
  const [audio, setAudio] = useState<"blocked" | "on" | "off">("blocked");
  // the fullscreen hook reads ParticipantView's own context, so the controls
  // have to render inside the stage and be portalled down into the footer
  const [controlsSlot, setControlsSlot] = useState<HTMLDivElement | null>(null);

  if (endedAt) {
    return (
      <>
        <LiveEnded />
        <LiveFooter />
      </>
    );
  }

  if (!speaker) {
    return (
      <>
        <LiveStagePending />
        <LiveFooter />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        {!speaker.isLocalParticipant && hasAudio(speaker) && (
          <>
            <AudioDrain stream={speaker.audioStream} />
            {audio === "on" && <Audio participant={speaker} trackType="audioTrack" />}
          </>
        )}
        <LiveStage
          participant={speaker}
          controls={
            <StageControls
              slot={controlsSlot}
              audioOn={audio === "on"}
              onAudioOnChange={(on) => setAudio(on ? "on" : "off")}
            />
          }
        />
        {audio === "blocked" && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <Button onClick={() => setAudio("on")}>
              <SpeakerSlashIcon />
              {m.live_unmute()}
            </Button>
          </div>
        )}
      </div>
      <LiveFooter>
        <div className="contents" ref={setControlsSlot} />
      </LiveFooter>
    </>
  );
}

/**
 * Plays the broadcaster's audio muted from the start. Audio that arrives with
 * nothing playing it backs up, so an unmute would start over a second behind
 * the video and take several seconds to catch up. A muted `<video>` may play
 * before the page has been clicked; a muted `<audio>` may not.
 */
function AudioDrain({ stream }: { stream: MediaStream | undefined }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !stream) return;
    element.muted = true;
    element.srcObject = stream;
    element.play().catch(() => {});
    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  return <video ref={ref} muted playsInline hidden />;
}

function StageControls({
  slot,
  audioOn,
  onAudioOnChange,
}: {
  slot: HTMLDivElement | null;
  audioOn: boolean;
  onAudioOnChange: (on: boolean) => void;
}) {
  if (!slot) return null;

  return createPortal(
    <>
      <LiveDuration />
      <ParticipantCounter />
      <VolumeControl audioOn={audioOn} onAudioOnChange={onAudioOnChange} />
      <FullscreenButton />
    </>,
    slot,
  );
}
