/** An offer pick as the counts read it: a key, and how many copies an any-copy pick asks for. */
type Counted = { key: string; count?: number };

export const countOf = (pick: { count?: number }) => pick.count ?? 1;

/** The copies a side holds, each any-copy pick counted as many times as it asks. */
export const totalOf = (picks: Iterable<{ count?: number }>) => {
  let total = 0;
  for (const pick of picks) total += countOf(pick);
  return total;
};

/**
 * One more or one fewer copy of an any-copy pick, kept within the copies `max` spares and the
 * side's `limit`; at zero the pick leaves. A pick not held yet joins at one.
 */
export function stepCount<P extends Counted>(
  selection: ReadonlyMap<string, P>,
  pick: P,
  delta: 1 | -1,
  max: number,
  limit: number,
): Map<string, P> {
  const next = new Map(selection);
  const held = selection.get(pick.key);
  const current = held ? countOf(held) : 0;
  const count = current + delta;
  if (count <= 0) {
    next.delete(pick.key);
    return next;
  }
  // only a step up is capped, so a count above what is spare now can still come down
  if (delta > 0 && (count > max || totalOf(selection.values()) >= limit)) return next;
  next.set(pick.key, { ...(held ?? pick), count });
  return next;
}

/**
 * A side without what one shown row stands for. A resolved copy stands for one copy of the ask it
 * `replaces`, and an ask's unfilled rest for the copies it still waits for, so either takes the
 * ask down by that many and leaves the rest; any other row leaves whole.
 */
export function takeOut<P extends Counted>(
  picks: readonly P[],
  shown: Counted & { replaces?: string },
): P[] {
  const key = shown.replaces ?? shown.key;
  return picks.flatMap((pick) => {
    if (pick.key !== key) return [pick];
    const left = countOf(pick) - countOf(shown);
    return left > 0 ? [{ ...pick, count: left }] : [];
  });
}

/** Offer items as rows: repeats of one any copy become one row with their count. */
export function groupRows<T>(items: readonly T[], keyOf: (item: T) => string) {
  const rows = new Map<string, { key: string; item: T; count: number }>();
  for (const item of items) {
    const key = keyOf(item);
    const row = rows.get(key);
    if (row) row.count += 1;
    else rows.set(key, { key, item, count: 1 });
  }
  return [...rows.values()];
}

/** Picks sharing a key become one, counting them: an offer may ask for the same any copy twice. */
export function mergeCounts<P extends Counted>(picks: readonly P[]): P[] {
  const merged = new Map<string, P>();
  for (const pick of picks) {
    const held = merged.get(pick.key);
    merged.set(pick.key, held ? { ...held, count: countOf(held) + countOf(pick) } : pick);
  }
  return [...merged.values()];
}
