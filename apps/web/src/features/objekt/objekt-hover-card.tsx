import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

import { CursorCard } from "@/components/shared/cursor-card";
import { cursorCardDelays } from "@/components/shared/cursor-card-delays";
import { TooltipPrimitive } from "@/components/ui/tooltip";

import { ObjektArtwork } from "./objekt-artwork";
import { getCollectionShortNo } from "./objekt-utils";

// off for now; flip back on to bring the card back
const OBJEKT_CARD_ENABLED = false;

const objektCardHandle = TooltipPrimitive.createHandle<OwnedObjekt>();

/** A table's objekt cell: opens the drawer, and shows the card while a mouse rests on it. */
export function ObjektNameButton({
  objekt,
  onOpen,
  srPrefix,
}: {
  objekt: OwnedObjekt;
  onOpen: (objekt: ValidObjekt) => void;
  /** read before the name, for a relation the row only shows visually */
  srPrefix?: string;
}) {
  return (
    <TooltipPrimitive.Trigger
      handle={objektCardHandle}
      payload={objekt}
      disabled={!OBJEKT_CARD_ENABLED}
      {...cursorCardDelays}
      render={
        <button
          type="button"
          onClick={() => onOpen(objekt)}
          className="focus-visible:ring-ring flex min-w-0 cursor-pointer items-center gap-2.5 self-stretch rounded-sm text-left outline-none focus-visible:ring-2"
        />
      }
    >
      {srPrefix !== undefined && <span className="sr-only">{srPrefix} </span>}
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
      {/* a real space, so a screen reader does not run the member into the number */}
      {objekt.member}{" "}
      <span className="font-mono text-xs">
        {getCollectionShortNo(objekt)} <b className="font-semibold">#{objekt.serial}</b>
      </span>
    </span>
  );
}

/** Mounted once at the root. */
export function ObjektHoverCard() {
  if (!OBJEKT_CARD_ENABLED) return null;

  return (
    <CursorCard handle={objektCardHandle} className="w-36 p-1.5">
      {(objekt) => (
        <div key={objekt.id} className="flex flex-col gap-1.5">
          {/* the container context `rounded-photocard` (5.4cqi) needs */}
          <div className="@container">
            <div className="rounded-photocard bg-secondary aspect-photocard relative overflow-hidden">
              {/* the thumbnail, not the front: at w-36 it is sharp, and the row already loaded it */}
              <ObjektArtwork objekt={objekt} priority />
            </div>
          </div>
          <ObjektName objekt={objekt} className="px-0.5 text-xs leading-snug" />
        </div>
      )}
    </CursorCard>
  );
}
