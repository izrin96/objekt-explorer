import type { PublicProfile } from "@repo/api/schemas/user";

import { useElementSize } from "@/hooks/use-element-size";
import { cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useSettings } from "@/stores/settings";

function BannerMedia({ url, type }: { url: string; type: string }) {
  if (type.startsWith("video")) {
    return (
      <video
        className="absolute size-full object-cover object-center"
        src={url}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return (
    <img
      src={url}
      className="absolute size-full object-cover object-center"
      alt={m.profile_banner_alt()}
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
 * How tall the blurred copy stays once the banner is hidden: enough colour to
 * read as "this profile has a banner", too little to be an artwork wall.
 */
const HINT_HEIGHT = 136;

/**
 * Two copies of the banner: one clamped to the container, one spanning the
 * page width behind it and blurred. Both sit at negative z so they pass behind
 * the translucent nav on scroll; the in-flow spacer reserves the clamped
 * copy's height and pulls the identity block up over its bottom edge.
 *
 * Hidden drops the clamped copy and the spacer and shrinks the blurred copy to
 * a short strip — the same two elements, no third media node.
 */
export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize<HTMLDivElement>();
  const hidden = useSettings((s) => s.hideBanner);

  if (!profile.bannerImgUrl || !profile.bannerImgType) return null;

  const media = <BannerMedia url={profile.bannerImgUrl} type={profile.bannerImgType} />;

  return (
    <>
      {!hidden && (
        <div className="absolute -top-5 -right-5 -left-5 -z-5 overflow-x-hidden">
          <div className={cn("aspect-banner", containerClass)}>
            <div ref={bannerRef} className="relative h-full 2xl:mask-x-from-[calc(100%-96px)]">
              {media}
              <GradientBanner />
            </div>
          </div>
        </div>
      )}

      <div
        className="absolute -top-5 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
        style={{ height: `${hidden ? HINT_HEIGHT : height}px` }}
      >
        {media}
        <GradientBanner className={hidden ? "from-0% backdrop-blur-2xl" : "backdrop-blur-xl"} />
        {hidden && <div className="absolute inset-0 bg-black/35" />}
      </div>

      {/* the overlap steps with the banner's height: the gradient only fades its
          bottom 30%, so a fixed desktop overlap puts the nickname over unfaded
          image on a short banner */}
      {!hidden && (
        <div className="aspect-banner pointer-events-none -mt-5 -mb-4 md:-mb-8 lg:-mb-10 xl:-mb-14" />
      )}
    </>
  );
}
