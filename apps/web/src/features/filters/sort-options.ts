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

/**
 * The directions the sort menu offers, the default first. A sort with one
 * direction is only ever read that way; a link can still carry the other.
 */
const SORT_DIRS: Record<ValidCustomSort, readonly ValidSortDirection[]> = {
  date: ["desc", "asc"],
  season: ["asc", "desc"],
  collectionNo: ["asc", "desc"],
  member: ["asc"],
  serial: ["asc", "desc"],
  duplicate: ["desc"],
  rare: ["asc"],
  price: ["asc", "desc"],
  floor: ["asc", "desc"],
  listedAt: ["desc"],
  supply: ["desc"],
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
 * The menu for a surface. A link can carry a sort or a direction the surface
 * does not offer; it leads the list rather than silently rewriting the URL.
 */
export function sortMenu(sorts: readonly ValidCustomSort[], current: SortOption): SortOption[] {
  const options = sorts.flatMap((sort) => SORT_DIRS[sort].map((dir) => ({ sort, dir })));
  const offered = options.some((o) => o.sort === current.sort && o.dir === current.dir);
  return offered ? options : [current, ...options];
}
