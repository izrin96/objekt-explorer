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
import { LiveSessionProvider } from "@/hooks/use-live-session";

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
        <CustomLivestreamPlayer
          callType="livestream"
          callId={live.videoCallId}
        />
      </StreamVideo>
    </LiveSessionProvider>
  );
}
