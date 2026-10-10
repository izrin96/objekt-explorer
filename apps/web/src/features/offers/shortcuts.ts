export const SHORTCUT_LIMIT = 8;

/** A shortcut's objekts: those `first` keeps lead, each group in its own order. */
export function shortcutItems<T>(items: readonly T[], first: (item: T) => boolean) {
  return [...items.filter(first), ...items.filter((item) => !first(item))].slice(0, SHORTCUT_LIMIT);
}

type Keyed = { key: string; replaces?: string };

/**
 * A side's picks after its shortcut tile for `pick` is clicked: a held one leaves, else `pick`
 * joins while there is room. `shown` is the side as laid out, where a resolved copy stands in
 * for its any-copy ask, so removing it removes the ask.
 */
export function togglePick<P extends Keyed>(
  current: P[],
  shown: readonly Keyed[],
  pick: P,
  limit: number,
): P[] {
  const held = shown.find((item) => item.key === pick.key);
  if (held) {
    const key = held.replaces ?? held.key;
    return current.filter((item) => item.key !== key);
  }
  if (current.length >= limit || current.some((item) => item.key === pick.key)) return current;
  return [...current, pick];
}
