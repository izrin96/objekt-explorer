"use client";

import type { LiveSession } from "@repo/cosmo/server/live";
import { StreamVideo, StreamVideoClient, type User } from "@stream-io/video-react-sdk";
import dynamic from "next/dynamic";

import { LiveSessionProvider } from "@/hooks/use-live-session";
import { clientEnv } from "@/lib/env/client";

import { CustomLivestreamPlayer, LiveEndedLayout } from "./custom-player";

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
        <div className="relative flex flex-col gap-2">
          {live.endedAt !== null ? (
            <LiveEndedLayout />
          ) : (
            <CustomLivestreamPlayer callType="livestream" callId={live.videoCallId} />
          )}
        </div>
      </StreamVideo>
    </LiveSessionProvider>
  );
}
