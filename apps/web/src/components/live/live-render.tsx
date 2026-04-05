"use client";

import type { LiveSession } from "@repo/cosmo/server/live";
import { StreamVideo, StreamVideoClient, type User } from "@stream-io/video-react-sdk";
import dynamic from "next/dynamic";

import { LiveSessionProvider } from "@/hooks/use-live-session";
import { clientEnv } from "@/lib/env";

import { CustomLivestreamPlayer } from "./custom-player";
import LiveEnded from "./live-ended";

const user: User = { type: "anonymous" };
const client = new StreamVideoClient({
  apiKey: clientEnv.NEXT_PUBLIC_LIVE_API_KEY,
  user,
});

type Props = {
  live: LiveSession;
};

export default dynamic(() => Promise.resolve(LiveStreamingRender), {
  ssr: false,
});

export function LiveStreamingRender({ live }: Props) {
  return (
    <LiveSessionProvider live={live}>
      <StreamVideo client={client}>
        {live.endedAt !== null ? (
          <LiveEnded />
        ) : (
          <CustomLivestreamPlayer callType="livestream" callId={live.videoCallId} />
        )}
      </StreamVideo>
    </LiveSessionProvider>
  );
}
