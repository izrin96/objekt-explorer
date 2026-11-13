type Paged = { collectionSlug: string; objektId: string | null; serial: number | null };

/**
 * Items with each collection's together, collections in first-seen order: the any-copy item
 * first, then the copies by ascending serial, one without a serial last.
 */
export function orderByCollection<T extends Paged>(items: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.collectionSlug);
    if (group) group.push(item);
    else groups.set(item.collectionSlug, [item]);
  }
  const rank = (item: T) => (item.objektId === null ? -1 : (item.serial ?? Infinity));
  return [...groups.values()].flatMap((group) => group.toSorted((a, b) => rank(a) - rank(b)));
}

/**
 * One page of `items`, which keep a collection's items together: it starts at `offset` and ends
 * at the last collection boundary at or below `offset + size`. A collection longer than `size` is
 * a page of its own. `nextOffset` is an index into `items`, null at the end.
 */
export function pageByCollection<T extends Pick<Paged, "collectionSlug">>(
  items: readonly T[],
  offset: number,
  size: number,
) {
  let cut: number | null = null;
  let first: number | null = null;
  for (let i = offset + 1; i < items.length; i++) {
    if (items[i]!.collectionSlug === items[i - 1]!.collectionSlug) continue;
    first ??= i;
    if (i > offset + size) break;
    cut = i;
  }
  const end = items.length - offset <= size ? items.length : (cut ?? first ?? items.length);
  return { page: items.slice(offset, end), nextOffset: end < items.length ? end : null };
}
