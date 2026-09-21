import { useEffect, useMemo, useState } from "react";

import { bannerImage, type BannerKind, bannerVideo, type LabBanner } from "@/fixtures/banners";
import { useElementSize } from "@/hooks/use-element-size";
import { cn, containerClass } from "@/lib/utils";

/**
 * Resolves a profile's banner media. The still banner is available
 * synchronously; the video takes ~1.4s to encode, so the still frame stands in
 * as a poster until it is ready.
 *
 * The still frame is a pure function of `(kind, seed)` over a module-level
 * cache, so it is derived during render rather than mirrored into state from
 * an effect — only the video, which cannot be known synchronously, is state.
 * It carries the seed it was recorded for, so switching profiles shows the new
 * still immediately instead of the previous profile's video.
 */
export function useBannerMedia(kind: BannerKind | null, seed: number): LabBanner | null {
  const [video, setVideo] = useState<{ seed: number; banner: LabBanner } | null>(null);

  const still = useMemo<LabBanner | null>(
    () => (kind === null ? null : { url: bannerImage(seed), type: "image/png" }),
    [kind, seed],
  );

  useEffect(() => {
    if (kind !== "video") return;

    let alive = true;
    void bannerVideo(seed).then((banner) => {
      if (alive && banner) setVideo({ seed, banner });
    });
    return () => {
      alive = false;
    };
  }, [kind, seed]);

  if (kind === "video" && video?.seed === seed) return video.banner;
  return still;
}

function BannerMedia({ banner }: { banner: LabBanner }) {
  if (banner.type.startsWith("video")) {
    return (
      <video
        className="absolute size-full object-cover object-center"
        src={banner.url}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return (
    <img
      src={banner.url}
      className="absolute size-full object-cover object-center"
      alt="Profile banner"
    />
  );
}

function GradientBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "to-background absolute inset-0 bg-linear-to-b from-transparent from-70% to-100%",
        className,
      )}
    />
  );
}

/**
 * How tall the blurred copy stays once the banner is hidden. The layer starts
 * at the top of the content area, so the whole strip is on show: enough colour
 * to read as "this profile has a banner", too little to be an artwork wall.
 */
const HINT_HEIGHT = 136;

/**
 * Port of `apps/website/src/components/profile/profile-banner.tsx`.
 *
 * Two copies of the same media: one clamped to the container width (the banner
 * proper) and one spanning the full page width behind it, blurred. Both start
 * at the top of the content area, just under the nav, and sit at negative z so
 * they pass behind the translucent nav on scroll. The in-flow spacer reserves
 * the banner's height and pulls the identity block up over its bottom edge.
 * Renders nothing at all when the profile has no banner.
 *
 * `hidden` (the eye toggle) drops the clamped copy and the spacer, and shrinks
 * the blurred copy to a short strip — the same two elements, no third media
 * node — so a profile whose banner is hidden still reads differently from one
 * that never had a banner.
 */
export function ProfileBanner({
  banner,
  hidden = false,
}: {
  banner: LabBanner | null;
  hidden?: boolean;
}) {
  const [bannerRef, { height }] = useElementSize<HTMLDivElement>();

  if (!banner) return null;

  return (
    <>
      {/* banner, clamped to the container */}
      {!hidden && (
        <div className="absolute -top-5 -right-5 -left-5 -z-5 overflow-x-hidden">
          <div className={cn("aspect-banner", containerClass)}>
            <div ref={bannerRef} className="relative h-full 2xl:mask-x-from-[calc(100%-96px)]">
              <BannerMedia banner={banner} />
              <GradientBanner />
            </div>
          </div>
        </div>
      )}

      {/* blurred copy filling the page width — the whole banner when shown, a hint strip when hidden */}
      <div
        className="absolute -top-5 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
        style={{ height: `${hidden ? HINT_HEIGHT : height}px` }}
      >
        <BannerMedia banner={banner} />
        <GradientBanner className={hidden ? "from-0% backdrop-blur-2xl" : "backdrop-blur-xl"} />
        {hidden && <div className="absolute inset-0 bg-black/35" />}
      </div>

      {/* Clearance: matches the banner box, then overlaps the identity block.
          The banner is only ~163px tall at 390px, so the desktop -56px overlap
          put the avatar across its bottom edge with barely any banner left
          above the nickname; below `md` the overlap drops to -16px. */}
      {!hidden && <div className="aspect-banner pointer-events-none -mt-5 -mb-4 md:-mb-14" />}
    </>
  );
}
