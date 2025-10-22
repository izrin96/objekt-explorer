import { StreamVideo, StreamVideoClient, type User } from "@stream-io/video-react-sdk";
import { LiveSessionProvider } from "@/hooks/use-live-session";
import type { LiveSession } from "@/lib/universal/cosmo/live";
import { CustomLivestreamPlayer } from "./custom-player";
import LiveEnded from "./live-ended";

const user: User = { type: "anonymous" };
const client = new StreamVideoClient({
  apiKey: import.meta.env.VITE_LIVE_API_KEY || "",
  user,
});

type Props = {
  live: LiveSession;
};

export default function LiveStreamingRender({ live }: Props) {
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
