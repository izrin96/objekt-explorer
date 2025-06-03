"use client";

import { useElementSize } from "@/hooks/use-element-size";
import { PublicProfile } from "@/lib/universal/user";
import Image from "next/image";

export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize();

  if (!(profile.bannerImgUrl && profile.bannerImgType)) return;

  const isVideo = profile.bannerImgType.startsWith("video");

  return (
    <>
      {/* banner */}
      <div className="absolute xl:top-0 top-14 inset-0 -z-5">
        <div className="mx-auto w-full max-w-7xl lg:max-w-(--breakpoint-xl) 2xl:max-w-(--breakpoint-2xl)">
          <div
            ref={bannerRef}
            className={
              "relative mask-x-from-100% xl:mask-x-from-97% aspect-[2.2/1]"
            }
          >
            {isVideo ? (
              <video
                src={profile.bannerImgUrl}
                className="object-cover object-center size-full"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <Image
                src={profile.bannerImgUrl}
                className="object-cover object-center size-full"
                fill
                alt="Banner"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg from-90% to-100%"></div>
          </div>
        </div>
      </div>
      {/* background */}
      <div
        className={"absolute xl:top-0 top-14 inset-0 -z-10"}
        style={{ height: `${height}px` }}
      >
        {isVideo ? (
          <video
            src={profile.bannerImgUrl}
            className="object-cover object-center size-full"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <Image
            src={profile.bannerImgUrl}
            className="object-cover object-center size-full"
            fill
            alt="Banner"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg backdrop-blur-xl from-90% to-100%"></div>
      </div>
    </>
  );
}

export function ProfileBannerClearance() {
  return <div className={"-mt-2 xl:-mt-16 aspect-[2.2/1]"}></div>;
}
