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
import Image from "next/image";

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
    <div className="h-[calc(100svh-140px)] relative w-full aspect-[9/16] flex flex-col items-center justify-center gap-2">
      <div className="relative aspect-square rounded overflow-hidden size-full">
        {liveSession.thumbnailImage && (
          <Image
            priority
            className="object-contain object-center size-full"
            fill
            src={liveSession.thumbnailImage}
            alt={liveSession.title}
          />
        )}
      </div>
      <div className="absolute bg-bg/50 size-full"></div>
      <div className="absolute flex justify-center font-semibold text-fg">
        Stream ended
      </div>
    </div>
  ) : (
    <CustomLivestreamPlayer callType="livestream" callId={callId} />
  );
}
