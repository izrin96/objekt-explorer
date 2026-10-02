import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

import { CursorCard, cursorCardDelays } from "@/components/shared/cursor-card";
import { TooltipPrimitive } from "@/components/ui/tooltip";

import { ObjektArtwork } from "./objekt-artwork";
import { getCollectionShortNo } from "./objekt-utils";

const objektCardHandle = TooltipPrimitive.createHandle<OwnedObjekt>();

/** A table's objekt cell: opens the drawer, and shows the card while a mouse rests on it. */
export function ObjektNameButton({
  objekt,
  onOpen,
}: {
  objekt: OwnedObjekt;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <TooltipPrimitive.Trigger
      handle={objektCardHandle}
      payload={objekt}
      {...cursorCardDelays}
      render={
        <button
          type="button"
          onClick={() => onOpen(objekt)}
          className="focus-visible:ring-ring flex min-w-0 cursor-pointer items-center gap-2.5 self-stretch rounded-sm text-left outline-none focus-visible:ring-2"
        />
      }
    >
      <img
        src={objekt.thumbnailImage}
        alt=""
        loading="lazy"
        decoding="async"
        className="bg-secondary h-7 w-4.5 shrink-0 rounded-[3px] object-cover"
      />
      <ObjektName objekt={objekt} className="truncate" />
    </TooltipPrimitive.Trigger>
  );
}

function ObjektName({ objekt, className }: { objekt: OwnedObjekt; className?: string }) {
  return (
    <span className={className}>
      {objekt.member}
      <span className="ml-1.5 font-mono text-xs">
        {getCollectionShortNo(objekt)} <b className="font-semibold">#{objekt.serial}</b>
      </span>
    </span>
  );
}

/** Mounted once at the root. */
export function ObjektHoverCard() {
  return (
    <CursorCard handle={objektCardHandle} className="w-36 p-1.5">
      {(objekt) => (
        <div key={objekt.id} className="flex flex-col gap-1.5">
          {/* the container context `rounded-photocard` (5.4cqi) needs */}
          <div className="@container">
            <div className="rounded-photocard bg-secondary aspect-photocard relative overflow-hidden">
              {/* the row already loaded the thumbnail, so it holds the frame until the front lands */}
              <img
                src={objekt.thumbnailImage}
                alt=""
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              <ObjektArtwork objekt={objekt} image="front" />
            </div>
          </div>
          <ObjektName objekt={objekt} className="px-0.5 text-xs leading-snug" />
        </div>
      )}
    </CursorCard>
  );
}
