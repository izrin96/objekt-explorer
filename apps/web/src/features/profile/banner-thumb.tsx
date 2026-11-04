import type { RefObject } from "react";

import { cn } from "@/lib/utils";

export const bannerThumbFrameClass = "aspect-banner relative w-full overflow-hidden border-b";

/** The banner when there is one, else a quiet grey carrying the Cosmo's initial. */
export function BannerThumb({
  bannerImgUrl,
  bannerImgType,
  initial,
  videoRef,
}: {
  bannerImgUrl: string | null | undefined;
  bannerImgType: string | null | undefined;
  initial?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  if (bannerImgUrl && bannerImgType) {
    return (
      <div className={cn(bannerThumbFrameClass, "bg-secondary")} aria-hidden>
        {bannerImgType.startsWith("video") ? (
          <video
            ref={videoRef}
            src={bannerImgUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <img
            src={bannerImgUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        bannerThumbFrameClass,
        "from-secondary to-muted grid place-items-center bg-linear-to-br",
      )}
      aria-hidden
    >
      {initial ? (
        <span className="font-display text-muted-foreground/40 text-6xl font-semibold uppercase select-none">
          {initial}
        </span>
      ) : null}
    </div>
  );
}
