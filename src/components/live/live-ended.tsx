"use client";

import { useLiveSession } from "@/hooks/use-live-session";
import Image from "next/image";
import React from "react";
import LiveFooter from "./live-footer";

export default function LiveEnded() {
  const liveSession = useLiveSession();
  return (
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
      <LiveFooter />
    </div>
  );
}
