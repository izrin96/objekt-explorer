import type { PublicProfile } from "@repo/api/schemas/profile";
import { useEffect, useRef, useState, type Ref } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useSettings } from "@/stores/settings";

function BannerMedia({
  url,
  type,
  decorative,
  videoRef,
}: {
  url: string;
  type: string;
  decorative?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
}) {
  if (type.startsWith("video")) {
    return (
      <video
        ref={videoRef}
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
      alt={decorative ? "" : m.profile_banner_alt()}
    />
  );
}

/** Wide enough for colour, small enough that copying a frame costs nothing; the blur hides it. */
const ECHO_WIDTH = 64;

/**
 * The blurred copy of a video banner, painted from the sharp copy's frames
 * so the video decodes once. A frame is skipped while the copy is not drawn.
 */
function VideoEcho({ video }: { video: HTMLVideoElement | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context || !("requestVideoFrameCallback" in video)) return;

    let handle = 0;
    const draw = () => {
      if (video.videoWidth && canvas.checkVisibility()) {
        // setting the height clears the canvas even when it is unchanged
        const height = Math.round((ECHO_WIDTH * video.videoHeight) / video.videoWidth);
        if (canvas.height !== height) canvas.height = height;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      handle = video.requestVideoFrameCallback(draw);
    };
    handle = video.requestVideoFrameCallback(draw);
    return () => video.cancelVideoFrameCallback(handle);
  }, [video]);

  return (
    <canvas
      ref={canvasRef}
      width={ECHO_WIDTH}
      className="absolute size-full object-cover object-center"
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
 * Both copies' height: the page column at the banner ratio, the column being the
 * viewport capped at `2xl` unless the Wide setting drops the cap. In CSS so the
 * server render draws it.
 */
const BANNER_HEIGHT =
  "h-[calc(min(100vw,var(--breakpoint-2xl))/var(--aspect-banner))] [[data-wide]_&]:h-[calc(100vw/var(--aspect-banner))]";

/**
 * Two copies of the banner: a sharp one, and one spanning the page width
 * behind it and blurred. Both sit at negative z so they pass behind the
 * translucent nav on scroll; the in-flow spacer reserves their height and pulls
 * the identity block up over the bottom edge.
 *
 * Past `2xl` the sharp copy reaches 60px beyond the column on each side at
 * the column's height, so it crops a little off the top and bottom of the
 * banner there rather than growing taller.
 *
 * Below `2xl` the sharp copy covers the blurred one, so the blurred one is not
 * drawn there. Hidden drops the sharp copy and the spacer and shrinks the
 * blurred copy to a short strip, which then plays a video itself.
 */
export function ProfileBanner({ profile }: { profile: PublicProfile }) {
  const hidden = useSettings((s) => s.hideBanner);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  const url = profile.bannerImgUrl;
  const type = profile.bannerImgType;
  if (!url || !type) return null;

  return (
    <>
      {!hidden && (
        <div className="absolute -top-5 left-1/2 -z-5 w-screen -translate-x-1/2 overflow-hidden">
          <div
            className={cn(
              "mx-auto w-full max-w-[calc(var(--breakpoint-2xl)+120px)] [[data-wide]_&]:max-w-none",
              BANNER_HEIGHT,
            )}
          >
            <div className="relative h-full 2xl:mask-x-from-[calc(100%-96px)]">
              <BannerMedia url={url} type={type} videoRef={setVideo} />
              <GradientBanner />
            </div>
          </div>
        </div>
      )}

      <div
        aria-hidden
        className={cn(
          "absolute -top-5 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden",
          !hidden && [BANNER_HEIGHT, "max-2xl:hidden"],
        )}
        style={hidden ? { height: `${HINT_HEIGHT}px` } : undefined}
      >
        {!hidden && type.startsWith("video") ? (
          <VideoEcho video={video} />
        ) : (
          <BannerMedia url={url} type={type} decorative />
        )}
        {/* the identity block reads in `text-foreground`, so the wash pulls the
            strip toward the page rather than always darkening it — a black
            scrim leaves near-black text on a dark banner in the light theme.
            It sits under the gradient so the strip still ends on the page colour */}
        {hidden && <div className="bg-background/85 absolute inset-0 dark:bg-black/35" />}
        <GradientBanner className={hidden ? "from-0% backdrop-blur-2xl" : "backdrop-blur-xl"} />
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
