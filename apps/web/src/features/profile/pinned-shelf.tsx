import { PushPinIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { ObjektGrid } from "@/features/objekt/objekt-grid";
import { m } from "@/paraglide/messages";

import { PinDnd, SortablePin } from "./pin-dnd";

type PinnedShelfProps = {
  objekts: ValidObjekt[];
  columns: number;
  /** false leaves the shelf a plain grid: no handles, no drag context */
  reorderable: boolean;
  onReorder: (tokenIds: string[]) => void;
  renderCard: (objekt: ValidObjekt, handle?: ReactNode) => ReactNode;
};

/**
 * The pinned row above the grid, in the owner's order. An empty shelf under a
 * "Pinned" heading is a section explaining that it has nothing to say, so the
 * heading only appears with a card under it.
 */
export function PinnedShelf({
  objekts,
  columns,
  reorderable,
  onReorder,
  renderCard,
}: PinnedShelfProps) {
  if (objekts.length === 0) return null;

  // one pin has nowhere to go, so the hint would be an instruction with no move
  const canDrag = reorderable && objekts.length > 1;
  const ids = objekts.map((objekt) => objekt.id);

  // the same grid as the one below it, so a pinned card sits in the same column
  // as the card under it at every column count
  const shelf = (
    <ObjektGrid columns={columns}>
      {canDrag
        ? objekts.map((objekt) => (
            <SortablePin key={objekt.id} id={objekt.id}>
              {(handle) => renderCard(objekt, handle)}
            </SortablePin>
          ))
        : objekts.map((objekt) => renderCard(objekt))}
    </ObjektGrid>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <PushPinIcon weight="fill" className="size-4" aria-hidden />
        <h2 className="font-display text-sm font-semibold">{m.profile_pinned_title()}</h2>
        {canDrag && (
          <span className="text-muted-foreground text-xs">{m.profile_pinned_reorder_hint()}</span>
        )}
      </div>

      {canDrag ? (
        <PinDnd
          ids={ids}
          onReorder={onReorder}
          renderOverlay={(id) => {
            const objekt = objekts.find((item) => item.id === id);
            return objekt ? renderCard(objekt) : null;
          }}
        >
          {shelf}
        </PinDnd>
      ) : (
        shelf
      )}
    </>
  );
}
