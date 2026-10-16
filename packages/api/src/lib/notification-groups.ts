/** A trade's and a conversation's notes show as one row; every other notification stands alone. */
export const GROUPED_TYPES = ["offer", "trade"] as const;

/** A row as the list read ranks it: its group, how many others the group holds, and the row. */
export type RankedNote<T> = { key: string; updates: number; item: T };

/**
 * Hangs each head's earlier rows under it, in the order given (newest first). `updates` is the
 * group's full count less the head, which can exceed the earlier rows a page carries.
 */
export function attachEarlier<T>(
  heads: readonly RankedNote<T>[],
  earlier: readonly RankedNote<T>[],
) {
  const byKey = Map.groupBy(earlier, (row) => row.key);
  return heads.map((head) => ({
    head,
    updates: head.updates > 0 ? head.updates : undefined,
    earlier: head.updates > 0 ? (byKey.get(head.key) ?? []) : undefined,
  }));
}
