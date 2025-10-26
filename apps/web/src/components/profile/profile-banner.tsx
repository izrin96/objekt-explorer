"use client";

import Image from "next/image";
import { useElementSize } from "@/hooks/use-element-size";
import type { PublicProfile } from "@/lib/universal/user";

export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const [bannerRef, { height }] = useElementSize();

  if (!(profile.bannerImgUrl && profile.bannerImgType)) return;

  const isVideo = profile.bannerImgType.startsWith("video");

  return (
    <>
      {/* banner */}
      <div className="-z-5 absolute inset-0 top-14 xl:top-0">
        <div className="mx-auto w-full max-w-7xl lg:max-w-(--breakpoint-xl) 2xl:max-w-(--breakpoint-2xl)">
          <div
            ref={bannerRef}
            className={"mask-x-from-100% xl:mask-x-from-97% relative aspect-[2.3/1]"}
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
            <div className="absolute inset-0 bg-linear-to-b from-90% from-transparent to-100% to-bg"></div>
          </div>
        </div>
      </div>
      {/* background */}
      <div className={"-z-10 absolute inset-0 top-14 xl:top-0"} style={{ height: `${height}px` }}>
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
        <div className="absolute inset-0 bg-linear-to-b from-90% from-transparent to-100% to-bg backdrop-blur-xl"></div>
      </div>
    </>
  );
}

export function ProfileBannerClearance() {
  return <div className={"-mt-2 xl:-mt-16 aspect-[2.3/1]"}></div>;
}
