import type { LiveSession } from "@repo/cosmo/server/live";
import { StreamVideo, StreamVideoClient, type User } from "@stream-io/video-react-sdk";

import { env } from "@/env";
import { LiveSessionProvider } from "@/hooks/use-live-session";

import { CustomLivestreamPlayer } from "./custom-player";
import LiveEnded from "./live-ended";

const user: User = { type: "anonymous" };
const client = new StreamVideoClient({
  apiKey: env.VITE_LIVE_API_KEY,
  user,
});

type Props = {
  live: LiveSession;
};

export default LiveStreamingRender;

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
