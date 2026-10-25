import type { CopyMode } from "../schemas/list-copy";

export type CopySourceEntry = {
  collectionSlug: string | null;
  objektId: string | null;
  price: number | null;
  isQyop: boolean;
  note: string | null;
};

export type CopyRow = {
  collectionSlug: string;
  objektId: string | null;
  price: number | null;
  isQyop: boolean;
  note: string | null;
};

export type OwnedCopy = { id: string; serial: number };

/**
 * Converts a source list's entries (in order) to rows for the target.
 * `owned` is the set of token ids still held in `tokens` mode, and in `expand` mode the copies
 * held per collection slug. `carried` and `leftOut` count copies in `rows` and `tokens` modes
 * and collections in the other two.
 */
export function buildCopyRows(
  mode: CopyMode,
  entries: CopySourceEntry[],
  owned: ReadonlySet<string> | ReadonlyMap<string, OwnedCopy[]>,
  carryPrices: boolean,
): { rows: CopyRow[]; carried: number; leftOut: number } {
  const rows: CopyRow[] = [];
  let leftOut = 0;
  const priced = (entry: CopySourceEntry) =>
    carryPrices
      ? { price: entry.price, isQyop: entry.isQyop, note: entry.note }
      : { price: null, isQyop: false, note: null };

  if (mode === "rows") {
    for (const entry of entries) {
      if (entry.collectionSlug === null) leftOut++;
      else
        rows.push({
          collectionSlug: entry.collectionSlug,
          objektId: null,
          ...priced(entry),
        });
    }
    return { rows, carried: rows.length, leftOut };
  }

  if (mode === "tokens") {
    const held = owned as ReadonlySet<string>;
    const seen = new Set<string>();
    for (const entry of entries) {
      const { collectionSlug, objektId } = entry;
      if (collectionSlug === null || objektId === null || !held.has(objektId)) leftOut++;
      else if (!seen.has(objektId)) {
        seen.add(objektId);
        rows.push({ collectionSlug, objektId, ...priced(entry) });
      }
    }
    return { rows, carried: rows.length, leftOut };
  }

  const held = mode === "expand" ? (owned as ReadonlyMap<string, OwnedCopy[]>) : null;
  const seen = new Set<string>();
  let carried = 0;
  for (const { collectionSlug } of entries) {
    if (collectionSlug === null) {
      leftOut++;
      continue;
    }
    if (seen.has(collectionSlug)) continue;
    seen.add(collectionSlug);
    if (!held) {
      rows.push({ collectionSlug, objektId: null, price: null, isQyop: false, note: null });
      carried++;
      continue;
    }
    const copies = held.get(collectionSlug);
    if (!copies?.length) {
      leftOut++;
      continue;
    }
    for (const copy of copies.toSorted((a, b) => a.serial - b.serial)) {
      rows.push({
        collectionSlug,
        objektId: copy.id,
        price: null,
        isQyop: false,
        note: null,
      });
    }
    carried++;
  }
  return { rows, carried, leftOut };
}
