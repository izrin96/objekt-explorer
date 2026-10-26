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
 * The copies an any-copy ask of `slug` may still take: those spared, less the ones `picks` already
 * name by serial, since a send counts a copy named by serial only once.
 */
export function copiesLeft(
  picks: Iterable<{ collectionSlug: string; objektId: string | null }>,
  slug: string,
  copies: number,
) {
  let named = 0;
  for (const pick of picks) if (pick.objektId !== null && pick.collectionSlug === slug) named += 1;
  return Math.max(0, copies - named);
}

/**
 * An any-copy pick set to `count` copies, kept within the copies `max` spares and the side's
 * `limit`; at zero the pick leaves. A pick not held yet joins.
 */
export function withCount<P extends Counted>(
  selection: ReadonlyMap<string, P>,
  pick: P,
  count: number,
  max: number,
  limit: number,
): Map<string, P> {
  const next = new Map(selection);
  const held = selection.get(pick.key);
  const current = held ? countOf(held) : 0;
  // only a raise is capped, so a count above what is spare now can still come down
  const room = current + limit - totalOf(selection.values());
  const capped = count > current ? Math.max(current, Math.min(count, max, room)) : count;
  if (capped <= 0) next.delete(pick.key);
  else next.set(pick.key, { ...(held ?? pick), count: capped });
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

/** A side without several shown rows at once, each taken out as `takeOut` takes one. */
export function takeOutAll<P extends Counted>(
  picks: readonly P[],
  shown: readonly (Counted & { replaces?: string })[],
): P[] {
  return shown.reduce<P[]>((left, row) => takeOut(left, row), [...picks]);
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
