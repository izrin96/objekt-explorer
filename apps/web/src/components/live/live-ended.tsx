"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { useLiveSession } from "@/hooks/use-live-session";

import LiveFooter from "./live-footer";

export default function LiveEnded() {
  const t = useTranslations("live");
  const liveSession = useLiveSession();
  return (
    <div className="relative flex aspect-9/16 h-[calc(100svh-140px)] w-full flex-col items-center justify-center gap-2">
      <div className="relative aspect-square size-full overflow-hidden rounded">
        {liveSession.thumbnailImage && (
          <Image
            className="size-full object-contain object-center"
            fill
            src={liveSession.thumbnailImage}
            alt={liveSession.title}
          />
        )}
      </div>
      <div className="bg-bg/50 absolute size-full"></div>
      <div className="text-fg absolute flex justify-center font-semibold">{t("live_stream_ended")}</div>
      <LiveFooter />
    </div>
  );
}
