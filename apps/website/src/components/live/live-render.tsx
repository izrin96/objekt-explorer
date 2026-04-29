import type { LiveSession } from "@repo/cosmo/server/live";
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useState } from "react";

import { LiveSessionProvider } from "@/hooks/use-live-session";
import { clientEnv } from "@/lib/env/client";

import { CustomLivestreamPlayer, LiveEndedLayout } from "./custom-player";

type Props = {
  live: LiveSession;
};

export default function LiveStreamingRender({ live }: Props) {
  const [client] = useState(
    new StreamVideoClient({
      apiKey: clientEnv.VITE_LIVE_API_KEY,
      user: { type: "anonymous" },
    }),
  );

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
