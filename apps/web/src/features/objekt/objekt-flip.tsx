import { ImageBrokenIcon } from "@phosphor-icons/react";
import { mediaKind } from "@repo/lib/collection-media";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektArtwork } from "./objekt-artwork";
import { ObjektSidebar } from "./objekt-sidebar";

/** The motion video, from the site's own copy, with the band over it as over the image. */
function MotionFront({ objekt, src }: { objekt: ValidObjekt; src: string }) {
  return (
    <>
      {/* muted for autoplay, and the card is the flip button so it holds no sound control;
          the poster is the front image until the first frame loads */}
      <video
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

  return (
    // the container context `rounded-photocard` (5.4cqi) needs
    <div className="@container relative">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={m.objekt_flip_card_aria()}
        onClick={() => setFlipped((prev) => !prev)}
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
            {objekt.frontMedia && mediaKind(objekt.frontMedia) === "video" && !reduceMotion ? (
              <MotionFront objekt={objekt} src={objekt.frontMedia} />
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
    </div>
  );
}
