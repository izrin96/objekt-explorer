import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { ObjektCard } from "@/features/objekt/objekt-card";
import { SelectedMark } from "@/features/objekt/selected-mark";
import { activateOnKey } from "@/lib/a11y";

import { tickedName } from "./ticked-name";

/**
 * A card that ticks on a tap, as the offer picker's do, never with the collection's indigo
 * selection ring. Shared by the composer's Add objekts and All objekts grids.
 */
export function TickTile({
  objekt,
  ticked,
  onToggle,
  overlay,
  caption,
  showLabel,
  title,
}: {
  objekt: ValidObjekt;
  ticked: boolean;
  onToggle: () => void;
  /** inert, over the artwork's bottom-end corner, such as a ratio chip */
  overlay?: ReactNode;
  /** under the tile and outside its control, so a button in it neither ticks nor loses its name */
  caption?: ReactNode;
  /** shows the name whatever the hide-label setting says */
  showLabel?: boolean;
  title?: string;
}) {
  // not a `<button>`: WebKit collapses the card's `aspect-ratio` box inside one
  const tile = (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={ticked}
      aria-label={tickedName(objekt)}
      title={title}
      onClick={onToggle}
      onKeyDown={(event) => activateOnKey(event, onToggle)}
      className="focus-visible:ring-ring @container relative cursor-pointer rounded-md outline-none focus-visible:ring-2"
    >
      <ObjektCard
        objekt={objekt}
        image="thumbnail"
        cornerBadge={overlay}
        hideLabel={showLabel ? false : undefined}
      />
      {ticked ? <SelectedMark /> : null}
    </div>
  );
  if (caption == null) return tile;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {tile}
      {caption}
    </div>
  );
}
