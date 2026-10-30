export type SortState<Key extends string> = { key: Key; dir: "asc" | "desc" };

/** A header click: the active column flips, any other starts in `firstDir`. */
export function nextSort<Key extends string>(
  prev: SortState<Key>,
  key: Key,
  firstDir: "asc" | "desc",
): SortState<Key> {
  return prev.key === key
    ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    : { key, dir: firstDir };
}
