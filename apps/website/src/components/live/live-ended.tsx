import { useLiveSession } from "@/hooks/use-live-session";
import { m } from "@/paraglide/messages";

export default function LiveEnded() {
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
        {m.live_live_stream_ended()}
      </div>
    </div>
  );
}
