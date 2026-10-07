export const SHORTCUT_LIMIT = 8;

/**
 * A shortcut's objekts: those `first` keeps lead, each group in its own order, and what the
 * offer already holds leaves before the cut, so the next one takes its place.
 */
export function shortcutItems<T>(
  items: readonly T[],
  { first, added }: { first: (item: T) => boolean; added: (item: T) => boolean },
) {
  const open = items.filter((item) => !added(item));
  return [...open.filter(first), ...open.filter((item) => !first(item))].slice(0, SHORTCUT_LIMIT);
}
