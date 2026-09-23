import type { LiveSession } from "@repo/cosmo/types/live";
import {
  Audio,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  hasAudio,
  useCallStateHooks,
  useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
            <LivestreamCall callId={live.videoCallId} />
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
  // the SDK keys calls by cid and hands back the same instance, so deriving one
  // during render costs nothing and keeps the join effect's dependency stable
  const call = useMemo(() => streamClient?.call("livestream", callId), [streamClient, callId]);

  useEffect(() => {
    if (!call) return;
    call.setPreferredIncomingVideoResolution({ width: 1080, height: 1920 });
    call.join().catch((error: unknown) => console.error("Failed to join call", error));
    return () => {
      call.leave().catch((error: unknown) => console.error("Failed to leave call", error));
    };
  }, [call]);

  if (!call) return <LiveStagePending />;

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
  const [unmuted, setUnmuted] = useState(false);
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

  if (!speaker) return <LiveStagePending />;

  return (
    <>
      <div className="relative">
        {!speaker.isLocalParticipant && unmuted && hasAudio(speaker) && (
          <Audio participant={speaker} trackType="audioTrack" />
        )}
        <LiveStage participant={speaker} controls={<StageControls slot={controlsSlot} />} />
        {!unmuted && (
          <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
            <Button onClick={() => setUnmuted(true)}>{m.live_unmute()}</Button>
          </div>
        )}
      </div>
      <LiveFooter>
        <div className="contents" ref={setControlsSlot} />
      </LiveFooter>
    </>
  );
}

function StageControls({ slot }: { slot: HTMLDivElement | null }) {
  if (!slot) return null;

  return createPortal(
    <>
      <LiveDuration />
      <ParticipantCounter />
      <VolumeControl />
      <FullscreenButton />
    </>,
    slot,
  );
}
