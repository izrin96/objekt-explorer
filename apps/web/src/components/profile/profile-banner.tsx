"use client";

import Image from "next/image";

import type { PublicProfile } from "@/lib/universal/user";

import { useElementSize } from "@/hooks/use-element-size";

export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize();

  if (!(profile.bannerImgUrl && profile.bannerImgType)) return;

  const isVideo = profile.bannerImgType.startsWith("video");

  return (
    <>
      {/* banner */}
      <div className="absolute inset-0 top-14 -z-5 xl:top-0">
        <div className="mx-auto w-full max-w-7xl lg:max-w-(--breakpoint-xl) 2xl:max-w-(--breakpoint-2xl)">
          <div
            ref={bannerRef}
            className={"relative aspect-[2.3/1] mask-x-from-100% xl:mask-x-from-97%"}
          >
            {isVideo ? (
              <video
                src={profile.bannerImgUrl}
                className="size-full object-cover object-center"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <Image
                src={profile.bannerImgUrl}
                className="size-full object-cover object-center"
                fill
                alt="Banner"
                priority
              />
            )}
            <div className="to-bg absolute inset-0 bg-linear-to-b from-transparent from-90% to-100%"></div>
          </div>
        </div>
      </div>
      {/* background */}
      <div className={"absolute inset-0 top-14 -z-10 xl:top-0"} style={{ height: `${height}px` }}>
        {isVideo ? (
          <video
            src={profile.bannerImgUrl}
            className="size-full object-cover object-center"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <Image
            src={profile.bannerImgUrl}
            className="size-full object-cover object-center"
            fill
            alt="Banner"
            priority
          />
        )}
        <div className="to-bg absolute inset-0 bg-linear-to-b from-transparent from-90% to-100% backdrop-blur-xl"></div>
      </div>
    </>
  );
}

export function ProfileBannerClearance() {
  return <div className={"-mt-2 aspect-[2.3/1] xl:-mt-16"}></div>;
}
