import type { GridObjekt } from "@repo/lib/types/objekt";

import { sortObjekts } from "@/features/filters/filter-utils";
import { isFiltering, type FilterSearch } from "@/features/filters/search-schema";

import { copiesIn, isObjektOwned, pinOrderOf } from "./objekt-utils";

export type VirtualItem<T extends GridObjekt = GridObjekt> =
  | { type: "label"; title: string }
  | { type: "row"; items: T[][]; rowIndex: number; groupTitle: string };

export type BuildVirtualDataConfig<T extends GridObjekt = GridObjekt> = {
  objekts: T[];
  filters: FilterSearch;
  columns: number;
  getArtist: (id: string) => { title: string } | undefined;
  compareMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
  /** pinned objekts lead their group, in the owner's order */
  isProfile?: boolean;
  rarityMap?: Map<string, number>;
};

function groupKey(
  objekt: GridObjekt,
  groupBy: NonNullable<FilterSearch["group_by"]>,
  getArtist: BuildVirtualDataConfig["getArtist"],
): string {
  switch (groupBy) {
    case "seasonCollectionNo":
      return `${objekt.season} ${objekt.collectionNo}`;
    case "artist":
      return getArtist(objekt.artist)?.title ?? objekt.artist;
    default:
      return objekt[groupBy];
  }
}

export function buildVirtualData<T extends GridObjekt>(
  config: BuildVirtualDataConfig<T>,
): VirtualItem<T>[] {
  const {
    objekts,
    filters,
    columns,
    getArtist,
    compareMember,
    compareSeason,
    compareClass,
    isProfile = false,
    rarityMap,
  } = config;

  // a filtered or pin-hidden grid is ordered by the sort alone: leading with
  // pins there would only scatter the sort the user asked for
  const pinFirst = isProfile && !filters.hidePin && !isFiltering(filters);

  const groupBy = filters.group_by;
  const groups: Record<string, T[]> = groupBy
    ? (Object.groupBy(objekts, (objekt) => groupKey(objekt, groupBy, getArtist)) as Record<
        string,
        T[]
      >)
    : { "": objekts };

  const groupDir = filters.group_dir ?? "desc";
  const ordered = Object.entries(groups).toSorted(([keyA], [keyB]) => {
    const [first, second] = groupDir === "asc" ? [keyA, keyB] : [keyB, keyA];
    if (groupBy === "member") return compareMember(first, second);
    if (groupBy === "class") return compareClass(first, second);
    if (groupBy === "season") return compareSeason(first, second);
    return first.localeCompare(second);
  });

  const result: VirtualItem<T>[] = [];

  for (const [key, items] of ordered) {
    if (key) result.push({ type: "label", title: key });

    let sorted = sortObjekts(items, filters, compareMember, compareSeason, rarityMap);

    if (pinFirst) {
      const pinned = sorted.filter((objekt) => isObjektOwned(objekt) && objekt.isPin === true);
      if (pinned.length > 0) {
        sorted = [
          ...pinned.toSorted((a, b) => pinOrderOf(b) - pinOrderOf(a)),
          ...sorted.filter((objekt) => !(isObjektOwned(objekt) && objekt.isPin === true)),
        ];
      }
    }

    let cells: T[][];
    if (filters.grouped) {
      cells = Object.values(
        Object.groupBy(sorted, (objekt) => objekt.collectionId) as Record<string, T[]>,
      );
    } else {
      cells = sorted.map((objekt) => [objekt]);
    }

    if (filters.sort === "duplicate") {
      cells =
        filters.sort_dir === "asc"
          ? cells.toSorted((a, b) => copiesIn(a) - copiesIn(b))
          : cells.toSorted((a, b) => copiesIn(b) - copiesIn(a));
    }

    const rowCount = Math.ceil(cells.length / columns);
    for (let i = 0; i < rowCount; i++) {
      result.push({
        type: "row",
        items: cells.slice(i * columns, (i + 1) * columns),
        rowIndex: i,
        groupTitle: key,
      });
    }
  }

  return result;
}
