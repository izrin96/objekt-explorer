import type { PublicProfile } from "@repo/api/schemas/user";

import { useElementSize } from "@/hooks/use-element-size";
import { cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
 * Two copies of the banner: one clamped to the container, one spanning the
 * page width behind it and blurred. Both sit at negative z so they pass behind
 * the translucent nav on scroll; the in-flow spacer reserves the clamped
 * copy's height and pulls the identity block up over its bottom edge.
 */
export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize<HTMLDivElement>();

  if (!profile.bannerImgUrl || !profile.bannerImgType) return null;

  const media = <BannerMedia url={profile.bannerImgUrl} type={profile.bannerImgType} />;

  return (
    <>
      <div className="absolute -top-5 -right-5 -left-5 -z-5 overflow-x-hidden">
        <div className={cn("aspect-banner", containerClass)}>
          <div ref={bannerRef} className="relative h-full 2xl:mask-x-from-[calc(100%-96px)]">
            {media}
            <GradientBanner />
          </div>
        </div>
      </div>

      <div
        className="absolute -top-5 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {media}
        <GradientBanner className="backdrop-blur-xl" />
      </div>

      {/* the banner is only ~163px tall at 390px, so the desktop overlap would
          put the avatar across its bottom edge with no banner left above the
          nickname */}
      <div className="aspect-banner pointer-events-none -mt-5 -mb-4 md:-mb-14" />
    </>
  );
}
