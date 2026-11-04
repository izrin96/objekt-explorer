import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { BannerThumb } from "@/features/profile/banner-thumb";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/paraglide/messages";

import type { Banner } from "./shared";

/**
 * A video banner plays only while its tile is on screen, so the feed fetches the videos in view
 * rather than every one. Under reduced motion it starts still; Play and Pause hold either way.
 */
export function TileVideo({ banner, name }: { banner: Banner; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // the server snapshot is `true`, so the server draws every video still
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduced;
  const url = banner.bannerImgUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!playing) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
    // a refetch can swap the file under the same tile, which resets the element
  }, [playing, url]);

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="*:border-b-0">
        <BannerThumb bannerImgUrl={url} bannerImgType={banner.bannerImgType} videoRef={videoRef} />
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        // a dark chip with a white icon reads over any frame, light or dark
        className="absolute end-2 bottom-2 bg-black/64 text-white backdrop-blur-sm hover:bg-black/80 data-pressed:bg-black/80"
        aria-label={
          playing
            ? m.mod_banners_pause_label({ profile: name })
            : m.mod_banners_play_label({ profile: name })
        }
        onClick={() => setChoice(!playing)}
      >
        {playing ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
      </Button>
    </div>
  );
}
