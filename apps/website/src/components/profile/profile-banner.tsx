import { useElementSize } from "@/hooks/use-element-size";
import type { PublicProfile } from "@/lib/universal/user";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Container } from "../intentui/container";

export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize();

  if (!(profile.bannerImgUrl && profile.bannerImgType)) return null;

  const isVideo = profile.bannerImgType.startsWith("video");

  return (
    <>
      {/* banner */}
      <div className="absolute inset-0 top-12 -z-5 lg:top-0">
        <div className="mx-auto w-full max-w-(--breakpoint-2xl)">
          <div
            ref={bannerRef}
            className="aspect-banner relative mask-x-from-100% 2xl:mask-x-from-90%"
          >
            {isVideo ? (
              <video
                className="absolute size-full object-cover object-top"
                src={profile.bannerImgUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={profile.bannerImgUrl}
                className="absolute size-full object-cover object-top"
                alt={m.profile_banner_alt()}
              />
            )}
            <GradientBanner />
          </div>
        </div>
      </div>
      {/* background */}
      <div className="absolute inset-0 top-12 -z-10 lg:top-0" style={{ height: `${height}px` }}>
        {isVideo ? (
          <video
            className="absolute size-full object-cover object-top"
            src={profile.bannerImgUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={profile.bannerImgUrl}
            className="absolute size-full object-cover object-top"
            alt={m.profile_banner_alt()}
          />
        )}
        <GradientBanner className="backdrop-blur-xl" />
      </div>
      {/* clearance */}
      <Container>
        <div className="aspect-banner -mt-4 lg:-mt-16"></div>
      </Container>
    </>
  );
}

function GradientBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "to-bg absolute inset-0 bg-linear-to-b from-transparent from-70% to-100%",
        className,
      )}
    />
  );
}
