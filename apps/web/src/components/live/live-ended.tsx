"use client";

import { useIntlayer } from "next-intlayer";

import { useLiveSession } from "@/hooks/use-live-session";

export default function LiveEnded() {
  const content = useIntlayer("live");
  const liveSession = useLiveSession();
  return (
    <div className="relative flex h-[calc(100svh-7.5rem)] w-full flex-col items-center justify-center gap-2">
      <div className="relative aspect-square size-full overflow-hidden rounded">
        {liveSession.thumbnailImage && (
          <img
            className="absolute size-full object-contain object-center"
            src={liveSession.thumbnailImage}
            alt={liveSession.title}
          />
        )}
      </div>
      <div className="bg-bg/50 absolute size-full"></div>
      <div className="text-fg absolute flex justify-center font-semibold">
        {content.live_stream_ended.value}
      </div>
    </div>
  );
}
