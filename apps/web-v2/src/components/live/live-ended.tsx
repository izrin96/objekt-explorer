import { useLiveSession } from "@/hooks/use-live-session";
import LiveFooter from "./live-footer";

export default function LiveEnded() {
  const liveSession = useLiveSession();
  return (
    <div className="relative flex aspect-[9/16] h-[calc(100svh-140px)] w-full flex-col items-center justify-center gap-2">
      <div className="relative aspect-square size-full overflow-hidden rounded">
        {liveSession.thumbnailImage && (
          <img
            className="absolute inset-0 size-full object-contain object-center"
            src={liveSession.thumbnailImage}
            alt={liveSession.title}
          />
        )}
      </div>
      <div className="absolute size-full bg-bg/50"></div>
      <div className="absolute flex justify-center font-semibold text-fg">Live stream ended</div>
      <LiveFooter />
    </div>
  );
}
