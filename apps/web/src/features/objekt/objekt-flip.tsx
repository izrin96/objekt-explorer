import { ImageBrokenIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektArtwork } from "./objekt-artwork";

/** The card body is the whole control, so Enter and Space come for free. */
export function ObjektFlip({ objekt }: { objekt: ValidObjekt }) {
  const [flipped, setFlipped] = useState(false);

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
            <ObjektArtwork objekt={objekt} image="front" />
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
