import type { FilterSearch } from "./search-schema";

/**
 * The long-tail filters one surface offers. Type is on every surface, so it is
 * not a member; everything else is named per surface by `LONG_TAIL` below.
 */
export type LongTailField =
  | "collection"
  | "transferable"
  | "grouped"
  | "hidePin"
  | "locked"
  | "missing"
  | "priced"
  | "edition"
  | "color";

/**
 * The old website's filter matrix, one column per surface: a field absent here
 * is absent from that surface's popover, its sheet and its "Filters · n" count.
 */
export const LONG_TAIL = {
  home: ["collection", "edition", "color"],
  market: ["collection", "priced", "edition", "color"],
  list: ["collection", "edition", "color"],
  collection: ["collection", "hidePin", "locked", "missing", "edition", "color"],
  trades: [],
  progress: ["collection", "edition"],
  stats: ["collection", "edition"],
} as const satisfies Record<string, readonly LongTailField[]>;

/** Count shown on the "Filters" button: long-tail filters only. */
export function longTailCount(filters: FilterSearch, fields: readonly LongTailField[]): number {
  const set = (field: LongTailField, on: boolean) => Number(fields.includes(field) && on);
  return (
    set("collection", (filters.collection?.length ?? 0) > 0) +
    set("transferable", filters.transferable === true) +
    set("grouped", filters.grouped === true) +
    set("hidePin", filters.hidePin === true) +
    set("locked", filters.locked !== undefined) +
    set("missing", filters.missing === true || filters.unowned === true) +
    set("priced", filters.priced === true) +
    set("edition", (filters.edition?.length ?? 0) > 0) +
    set("color", filters.color !== undefined) +
    Number((filters.on_offline?.length ?? 0) > 0)
  );
}
