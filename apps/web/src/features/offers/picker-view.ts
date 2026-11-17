import type { PickerNarrowing, PickerSort } from "@repo/api/schemas/offer";

import { type PickerFacetFilters, pickerFiltered } from "@/features/filters/picker-filters";

/** The picker's remembered view: how it orders and whether it leaves out copies that cannot be sent. */
export type PickerView = { sort: PickerSort; hideUntransferable: boolean };

/** The query input for a view: only what differs from the default, so a default read keeps today's input and key. */
export const viewInput = (
  view: PickerView,
): Pick<PickerNarrowing, "sort" | "transferableOnly"> => ({
  ...(view.sort !== "default" && { sort: view.sort }),
  ...(view.hideUntransferable && { transferableOnly: true }),
});

/** Sort hides nothing, so only the switch counts toward the folded filters' badge. */
export const viewActiveCount = (view: PickerView) => (view.hideUntransferable ? 1 : 0);

export type EmptyReason = "filtered" | "match" | "hide" | "plain";

/**
 * Why a picker came back empty, first rule that applies. Under a locked match the match switch
 * cannot be named alone, so hide plus a locked match reads as filtered.
 */
export function emptyReason(
  filters: PickerFacetFilters & { matchOnly: boolean },
  view: PickerView,
  matchLocked: boolean,
): { reason: EmptyReason; turnOff: boolean } {
  const hide = view.hideUntransferable;
  if (pickerFiltered(filters)) return { reason: "filtered", turnOff: false };
  if (filters.matchOnly && !hide) return { reason: "match", turnOff: !matchLocked };
  if (hide && !filters.matchOnly) return { reason: "hide", turnOff: true };
  if (hide) return { reason: "filtered", turnOff: false };
  return { reason: "plain", turnOff: false };
}
