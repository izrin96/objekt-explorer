"use client";

import React from "react";
import {
  StreamVideo,
  StreamVideoClient,
  User,
} from "@stream-io/video-react-sdk";
import { CustomLivestreamPlayer } from "./custom-player";
import { env } from "@/env";
import { LiveSession } from "@/lib/universal/cosmo/live";
import { LiveSessionProvider, useLiveSession } from "@/hooks/use-live-session";
import LiveEnded from "./live-ended";

const user: User = { type: "anonymous" };
const client = new StreamVideoClient({
  apiKey: env.NEXT_PUBLIC_LIVE_API_KEY,
  user,
});

type Props = {
  live: LiveSession;
};

export default function LiveStreamingRender({ live }: Props) {
  return (
    <LiveSessionProvider live={live}>
      <StreamVideo client={client}>
        <LivestreamWrapper callId={live.videoCallId} />
      </StreamVideo>
    </LiveSessionProvider>
  );
}

function LivestreamWrapper({ callId }: { callId: string }) {
  const liveSession = useLiveSession();

  return liveSession.endedAt !== null ? (
    <LiveEnded />
  ) : (
    <CustomLivestreamPlayer callType="livestream" callId={callId} />
  );
}
