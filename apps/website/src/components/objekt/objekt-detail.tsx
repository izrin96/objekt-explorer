import { type ValidObjekt } from "@repo/lib/types/objekt";
import { Suspense, useCallback, useState } from "react";

import { unobtainableSlugs } from "@/lib/unobtainables";
import { m } from "@/paraglide/messages";

import { AttributePanel } from "./objekt-attribute";
import { ObjektPanel } from "./objekt-panel";
import ObjektSidebar from "./objekt-sidebar";

type ObjektDetailProps = {
  objekts: ValidObjekt[];
};

export default function ObjektDetail({ objekts }: ObjektDetailProps) {
  const [objekt] = objekts;
  if (!objekt) return null;

  return (
    <div
      className="flex size-full flex-col gap-2 p-2 md:grid md:h-134 md:grid-cols-3 md:p-3"
      style={
        {
          "--objekt-bg-color": objekt.backgroundColor,
          "--objekt-text-color": objekt.textColor,
        } as Record<string, string>
      }
    >
      <div className="flex h-84 self-center select-none md:h-fit">
        <ObjektCard objekts={objekts} />
      </div>
      <div className="relative flex min-h-screen flex-col gap-2 overflow-y-auto px-2 md:col-span-2 md:-me-2 md:min-h-full md:scrollbar-gutter-stable">
        <div className="text-sm font-semibold">{objekt.collectionId}</div>
        <Suspense>
          <AttributePanel objekt={objekt} unobtainable={unobtainableSlugs.has(objekt.slug)} />
          <ObjektPanel objekts={objekts} />
        </Suspense>
        <div className="flex-1" aria-hidden />
      </div>
    </div>
  );
}

export function ObjektCard({ objekts }: { objekts: ValidObjekt[] }) {
  const [objekt] = objekts;
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((prev) => !prev);
    }
  }, []);

  if (!objekt) return null;

  return (
    <div
      className="aspect-photocard @container relative size-full cursor-pointer"
      tabIndex={0}
      role="button"
      aria-label={m.objekt_flip_card_aria()}
      onClick={() => setFlipped((prev) => !prev)}
      onKeyDown={handleKeyDown}
    >
      <div
        data-flipped={flipped}
        className="relative size-full transform-gpu touch-manipulation transition-transform duration-300 will-change-transform transform-3d data-[flipped=true]:rotate-y-180"
      >
        {/* Front side */}
        <div className="rounded-photocard absolute inset-0 grid rotate-y-0 overflow-hidden shadow-md contain-layout contain-paint backface-hidden [&>*]:col-start-1 [&>*]:row-start-1">
          {/* Progressive loading: show thumbnail until front image loads */}
          <img
            className="-z-10 size-full object-cover"
            loading="eager"
            src={objekt.frontImage}
            alt={objekt.collectionId}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <img
              className="-z-10 size-full object-cover"
              loading="eager"
              src={objekt.thumbnailImage}
              alt={objekt.collectionId}
            />
          )}
          <ObjektSidebar objekt={objekt} hideSerial={objekts.length > 1} />
        </div>
        {/* Back side */}
        <div className="rounded-photocard absolute inset-0 grid rotate-y-180 overflow-hidden shadow-md contain-layout contain-paint backface-hidden [&>*]:col-start-1 [&>*]:row-start-1">
          {objekt.backImage && (
            <img
              className="-z-10 size-full object-cover"
              loading="lazy"
              decoding="async"
              src={objekt.backImage}
              alt={objekt.collectionId}
              onLoad={(e) => {
                e.currentTarget
                  .decode()
                  .then(() => setBackLoaded(true))
                  .catch(() => setBackLoaded(true));
              }}
            />
          )}
          {!backLoaded && (
            <div className="aspect-photocard relative flex size-full bg-white">
              <div className="h-[88%] w-[91%] self-center rounded-r-[3.5cqi] bg-(--objekt-bg-color) p-5"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
