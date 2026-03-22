import { useLiveSession } from "@/hooks/use-live-session";
import { useTranslations } from "@/lib/i18n/context";

import LiveFooter from "./live-footer";

export default function LiveEnded() {
  const t = useTranslations("live");
  const liveSession = useLiveSession();
  return (
    <div className="relative flex aspect-9/16 h-[calc(100svh-140px)] w-full flex-col items-center justify-center gap-2">
      <div className="relative aspect-square size-full overflow-hidden rounded">
        {liveSession.thumbnailImage && (
          <img
            className="size-full object-contain object-center"
            src={liveSession.thumbnailImage}
            alt={liveSession.title}
          />
        )}
      </div>
      <div className="bg-bg/50 absolute size-full"></div>
      <div className="text-fg absolute flex justify-center font-semibold">
        {t("live_stream_ended")}
      </div>
      <LiveFooter />
    </div>
  );
}
