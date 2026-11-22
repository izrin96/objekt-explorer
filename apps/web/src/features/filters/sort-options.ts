import type { ValidCustomSort, ValidSortDirection } from "@repo/cosmo/types/common";

/** The direction a sort is normally read in: the one it falls back to when the URL names none. */
export const SORT_DEFAULT_DIR: Record<ValidCustomSort, ValidSortDirection> = {
  date: "desc",
  season: "asc",
  collectionNo: "asc",
  member: "asc",
  serial: "asc",
  duplicate: "desc",
  rare: "asc",
  price: "asc",
  floor: "asc",
  listedAt: "desc",
  supply: "desc",
};

export type SortOption = { sort: ValidCustomSort; dir: ValidSortDirection };

/** One menu value per sort and direction, since the select holds a single string. */
export type SortOptionValue = `${ValidCustomSort}:${ValidSortDirection}`;

export function sortOptionValue({ sort, dir }: SortOption): SortOptionValue {
  return `${sort}:${dir}`;
}

export function parseSortOptionValue(value: SortOptionValue): SortOption {
  const [sort, dir] = value.split(":") as [ValidCustomSort, ValidSortDirection];
  return { sort, dir };
}

/** The sort the grid is in: the URL's, else the surface's first sort in its usual direction. */
export function currentSortOption(
  sorts: readonly ValidCustomSort[],
  sort: ValidCustomSort | undefined,
  dir: ValidSortDirection | undefined,
): SortOption {
  const current = sort ?? sorts[0] ?? "date";
  return { sort: current, dir: dir ?? SORT_DEFAULT_DIR[current] };
}

/**
 * The menu for a surface: each sort in its usual direction, then reversed. A
 * link can carry a sort the surface does not offer; it leads the list rather
 * than silently rewriting the URL.
 */
export function sortMenu(sorts: readonly ValidCustomSort[], current: SortOption): SortOption[] {
  const options = sorts.flatMap((sort): SortOption[] => {
    const dir = SORT_DEFAULT_DIR[sort];
    return [
      { sort, dir },
      { sort, dir: dir === "asc" ? "desc" : "asc" },
    ];
  });
  return sorts.includes(current.sort) ? options : [current, ...options];
}
