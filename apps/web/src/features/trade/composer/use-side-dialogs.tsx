import type { ListObjekt } from "@repo/lib/types/objekt";
import { type RefObject, useRef } from "react";

import type { StoredList } from "@/features/list/list-draft";
import type { RatioSide } from "@/features/list/ratio-text";
import { RemoveFromListDialog } from "@/features/list/remove-from-list-dialog";
import { SetPriceDialog } from "@/features/list/set-price-dialog";
import { SetRatioDialog } from "@/features/list/set-ratio-dialog";
import { useEntryDialogs } from "@/features/list/use-entry-dialogs";

import type { EntryActions } from "./preview-entries";

const THUMBS = "[data-entry-thumb], [data-entry-more]";

/** where an action's dialog returns focus: looked up when it closes, since a remove can remount the thumbnails */
type EntryTarget = {
  kind: "entry";
  grid: Element | null;
  id: string;
  /** the next thumbnail's objekt; null when `thumb` was the last thumbnail or sat before "+N" */
  next: string | null;
  index: number;
  removed: boolean;
};

/** a bulk action's: the control that opened the dialog, which a remove leaves disabled */
type BulkTarget = { kind: "bulk"; from: HTMLElement | null; removed: boolean };

type FocusTarget = EntryTarget | BulkTarget;

function focusTarget(target: FocusTarget | null, fallback: HTMLElement | null) {
  if (!target) return fallback;
  if (target.kind === "bulk") {
    const { from, removed } = target;
    const usable = !removed && from?.isConnected === true && !from.matches(":disabled");
    return usable ? from : fallback;
  }
  if (!target.grid) return fallback;
  const thumbs = [...target.grid.querySelectorAll<HTMLElement>(THUMBS)];
  const byId = (id: string | null) =>
    id === null ? undefined : thumbs.find((el) => el.dataset.entryThumb === id);
  // after a remove, whatever moved into the removed thumbnail's place: the objekt that slid in from
  // behind "+N", "+N" itself, or nothing when it was the last
  const found = target.removed ? (byId(target.next) ?? thumbs[target.index]) : byId(target.id);
  return found ?? fallback;
}

/**
 * The list page's Set price, Set ratio and Remove dialogs for one side, mounted once, not per
 * thumbnail. Focus returns to the objekt's thumbnail, or after a remove to the next one, else
 * `fallback`. A bulk action returns it to the control it names, or after a remove to `fallback`.
 */
export function useSideDialogs({
  slug,
  stored,
  side,
  fallback,
}: {
  slug: string;
  stored: StoredList | undefined;
  side: RatioSide | null;
  fallback: RefObject<HTMLElement | null>;
}) {
  const { openPrice, openRatio, openRemove, price, ratio, remove } = useEntryDialogs();
  const target = useRef<FocusTarget | null>(null);
  const currency = stored?.listType === "sale" ? (stored.currency ?? null) : null;
  const listRatio = stored?.ratio ?? null;

  const openAt = (open: (objekts: ListObjekt[]) => void, entry: ListObjekt, thumb: HTMLElement) => {
    const grid = thumb.closest("[data-entry-grid]");
    const thumbs = grid ? [...grid.querySelectorAll<HTMLElement>(THUMBS)] : [];
    const index = thumbs.indexOf(thumb);
    target.current = {
      kind: "entry",
      grid,
      id: String(entry.entryId),
      next: thumbs[index + 1]?.dataset.entryThumb ?? null,
      index,
      removed: false,
    };
    open([entry]);
  };
  const openAll = (
    open: (objekts: ListObjekt[]) => void,
    objekts: ListObjekt[],
    from: HTMLElement | null,
  ) => {
    target.current = { kind: "bulk", from, removed: false };
    open(objekts);
  };
  const finalFocus = () => focusTarget(target.current, fallback.current);
  const bulkActions = {
    price:
      currency === null
        ? null
        : (objekts: ListObjekt[], from: HTMLElement | null) => openAll(openPrice, objekts, from),
    ratio:
      side === null
        ? null
        : (objekts: ListObjekt[], from: HTMLElement | null) => openAll(openRatio, objekts, from),
    remove: (objekts: ListObjekt[], from: HTMLElement | null) => openAll(openRemove, objekts, from),
  };
  const actions: EntryActions = {
    price: currency === null ? null : (entry, thumb) => openAt(openPrice, entry, thumb),
    ratio: side === null ? null : (entry, thumb) => openAt(openRatio, entry, thumb),
    remove: (entry, thumb) => openAt(openRemove, entry, thumb),
  };
  const dialogs = (
    <>
      {currency === null ? null : (
        <SetPriceDialog {...price} slug={slug} currency={currency} finalFocus={finalFocus} />
      )}
      {side === null ? null : (
        <SetRatioDialog
          {...ratio}
          slug={slug}
          side={side}
          listRatio={listRatio}
          finalFocus={finalFocus}
        />
      )}
      <RemoveFromListDialog
        {...remove}
        slug={slug}
        finalFocus={finalFocus}
        onRemoved={() => {
          if (target.current) target.current.removed = true;
        }}
      />
    </>
  );
  return { actions, bulkActions, dialogs, currency };
}
