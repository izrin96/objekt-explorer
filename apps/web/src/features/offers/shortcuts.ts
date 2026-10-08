export const SHORTCUT_LIMIT = 8;

/**
 * A shortcut's objekts: those `first` keeps lead, each group in its own order. What the offer
 * already holds stays in its place, so a click never moves the tiles under the pointer.
 */
export function shortcutItems<T>(items: readonly T[], first: (item: T) => boolean) {
  return [...items.filter(first), ...items.filter((item) => !first(item))].slice(0, SHORTCUT_LIMIT);
}
