import { useElementSize } from "@/hooks/use-element-size";
import type { PublicProfile } from "@/lib/universal/user";
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
            className="relative aspect-[2.4/1] mask-x-from-100% 2xl:mask-x-from-90%"
          >
            {isVideo ? (
              <video
                className="size-full object-cover object-center"
                src={profile.bannerImgUrl}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={profile.bannerImgUrl}
                className="absolute size-full object-cover object-center"
                alt={m.profile_banner_alt()}
              />
            )}
            <div className="to-bg absolute inset-0 bg-linear-to-b from-transparent from-70% to-100%"></div>
          </div>
        </div>
      </div>
      {/* background */}
      <div className="absolute inset-0 top-12 -z-10 lg:top-0" style={{ height: `${height}px` }}>
        {isVideo ? (
          <video
            className="size-full object-cover object-center"
            src={profile.bannerImgUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={profile.bannerImgUrl}
            className="absolute size-full object-cover object-center"
            alt={m.profile_banner_alt()}
          />
        )}
        <div className="to-bg absolute inset-0 bg-linear-to-b from-transparent from-70% to-100% backdrop-blur-xl"></div>
      </div>
      {/* clearance */}
      <Container>
        <div className="-mt-4 aspect-[2.4/1] lg:-mt-16"></div>
      </Container>
    </>
  );
}
