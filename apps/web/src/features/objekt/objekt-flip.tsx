import { ImageBrokenIcon, SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import { mediaKind } from "@repo/lib/collection-media";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type RefObject, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektArtwork } from "./objekt-artwork";
import { ObjektSidebar } from "./objekt-sidebar";

/** The motion video, from the site's own copy, with the band over it as over the image. */
function MotionFront({
  objekt,
  src,
  videoRef,
}: {
  objekt: ValidObjekt;
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  return (
    <>
      {/* muted for autoplay; the sound button sits outside the card, which is the flip button.
          The poster is the front image until the first frame loads */}
      <video
        ref={videoRef}
        src={src}
        poster={objekt.frontImage}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        disablePictureInPicture
        className="absolute inset-0 size-full object-cover"
      />
      <ObjektSidebar objekt={objekt} />
    </>
  );
}

/** The card body is the whole control, so Enter and Space come for free. */
export function ObjektFlip({ objekt }: { objekt: ValidObjekt }) {
  const [flipped, setFlipped] = useState(false);
  // the server snapshot reads as "reduce", so the still image is what server and first paint draw
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const motion = !!objekt.frontMedia && mediaKind(objekt.frontMedia) === "video" && !reduceMotion;

  // React sets `muted` only on mount, so sound is toggled on the element itself
  function setSound(on: boolean) {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !on;
    setSoundOn(on);
    if (!on) return;
    // a browser that refuses sound pauses the video, so fall back to the muted loop
    video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => {});
      setSoundOn(false);
    });
  }

  return (
    // the container context `rounded-photocard` (5.4cqi) needs
    <div className="@container relative">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={m.objekt_flip_card_aria()}
        onClick={() => {
          // the back hides the video, so its sound stops with it
          if (!flipped && soundOn) setSound(false);
          setFlipped(!flipped);
        }}
        className="focus-visible:ring-ring rounded-photocard block w-full cursor-pointer outline-none perspective-distant focus-visible:ring-2"
      >
        <div
          className={cn(
            "aspect-photocard relative w-full transition-transform duration-350 ease-out transform-3d motion-reduce:transition-none",
            flipped && "rotate-y-180",
          )}
        >
          {/* not ObjektCard: its long press turns the iOS callout off, and
              here the image should be saveable */}
          <div className="rounded-photocard bg-secondary absolute inset-0 overflow-hidden backface-hidden">
            {motion && objekt.frontMedia ? (
              <MotionFront objekt={objekt} src={objekt.frontMedia} videoRef={videoRef} />
            ) : (
              <ObjektArtwork objekt={objekt} image="front" />
            )}
          </div>
          <div className="rounded-photocard absolute inset-0 rotate-y-180 overflow-hidden backface-hidden">
            {objekt.backImage ? (
              <img
                src={objekt.backImage}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="size-full object-cover"
              />
            ) : (
              <div
                className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center"
                style={{ background: objekt.backgroundColor, color: objekt.textColor }}
              >
                <ImageBrokenIcon size={32} weight="light" />
                <span className="text-xs font-medium">{m.objekt_no_back_image()}</span>
              </div>
            )}
          </div>
        </div>
      </button>
      {motion && objekt.hasAudio && !flipped ? (
        <Button
          size="icon-sm"
          variant="secondary"
          aria-pressed={soundOn}
          aria-label={m.objekt_sound_aria()}
          onClick={() => setSound(!soundOn)}
          className="absolute top-2 left-2 rounded-full"
        >
          {soundOn ? <SpeakerHighIcon weight="fill" /> : <SpeakerSlashIcon weight="fill" />}
        </Button>
      ) : null}
    </div>
  );
}
