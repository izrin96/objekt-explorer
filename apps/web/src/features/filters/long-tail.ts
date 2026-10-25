import type { FilterSearch } from "./search-schema";

/** The long-tail filters one surface offers, named per surface by `LONG_TAIL` below. */
export type LongTailField = "hidePin" | "locked" | "missing" | "priced" | "edition" | "color";

/**
 * The old website's filter matrix, one column per surface: a field absent here
 * is absent from that surface's popover, its sheet and its "Filters · n" count.
 */
export const LONG_TAIL = {
  home: ["edition", "color"],
  market: ["priced", "edition", "color"],
  list: ["edition", "color"],
  collection: ["hidePin", "locked", "missing", "edition", "color"],
  trades: [],
  progress: ["edition"],
  stats: ["edition"],
} as const satisfies Record<string, readonly LongTailField[]>;

/** Count shown on the "Filters" button: long-tail filters only. */
export function longTailCount(filters: FilterSearch, fields: readonly LongTailField[]): number {
  const set = (field: LongTailField, on: boolean) => Number(fields.includes(field) && on);
  return (
    set("hidePin", filters.hidePin === true) +
    set("locked", filters.locked !== undefined) +
    set("missing", filters.missing === true || filters.unowned === true) +
    set("priced", filters.priced === true) +
    set("edition", (filters.edition?.length ?? 0) > 0) +
    set("color", filters.color !== undefined)
  );
}
