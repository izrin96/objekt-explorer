import { ImageBrokenIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { ObjektCard } from "@/components/objekt-card";
import type { LabObjekt } from "@/fixtures/objekts";
import { cn } from "@/lib/utils";

/**
 * The drawer's big card, flippable to `backImage`.
 *
 * Only the drawer uses it — the grids show the printed front and nothing else,
 * so the flip lives here rather than inside `ObjektCard`. The card body is the
 * whole control (`aria-pressed`, Enter / Space for free); there is no separate
 * rotate button, the card is the affordance.
 *
 * Most collections have no back art (15 of 180 fixture rows do), so the back
 * face falls back to the objekt's own two colours rather than a grey box.
 */
export function ObjektFlip({ objekt }: { objekt: LabObjekt }) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((prev) => !prev);

  return (
    // the container context `rounded-photocard` (5.4cqi) needs: the front face
    // gets one from ObjektCard, the back face has no other ancestor carrying it
    <div className="@container relative">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label="Flip objekt"
        onClick={flip}
        className="focus-visible:ring-ring rounded-photocard block w-full cursor-pointer outline-none perspective-distant focus-visible:ring-2"
      >
        <div
          className={cn(
            "aspect-photocard transform-3d relative w-full transition-transform duration-350 ease-out motion-reduce:transition-none",
            flipped && "rotate-y-180",
          )}
        >
          <div className="absolute inset-0 backface-hidden">
            <ObjektCard objekt={objekt} image="front" hideLabel />
          </div>
          <div className="rounded-photocard absolute inset-0 rotate-y-180 overflow-hidden backface-hidden">
            {objekt.backImage ? (
              <img
                src={objekt.backImage}
                alt={`${objekt.member} back`}
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
                <span className="text-xs font-medium">No back image</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
