import type { ValidObjekt } from "@repo/lib/types/objekt";

import { sortObjekts } from "@/features/filters/filter-utils";
import type { FilterSearch } from "@/features/filters/search-schema";

export type VirtualItem =
  | { type: "label"; title: string }
  | { type: "row"; items: ValidObjekt[][]; rowIndex: number; groupTitle: string };

export type BuildVirtualDataConfig = {
  objekts: ValidObjekt[];
  filters: FilterSearch;
  columns: number;
  getArtist: (id: string) => { title: string } | undefined;
  compareMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
  rarityMap?: Map<string, number>;
};

function groupKey(
  objekt: ValidObjekt,
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

export function buildVirtualData(config: BuildVirtualDataConfig): VirtualItem[] {
  const {
    objekts,
    filters,
    columns,
    getArtist,
    compareMember,
    compareSeason,
    compareClass,
    rarityMap,
  } = config;

  const groupBy = filters.group_by;
  const groups: Record<string, ValidObjekt[]> = groupBy
    ? (Object.groupBy(objekts, (objekt) => groupKey(objekt, groupBy, getArtist)) as Record<
        string,
        ValidObjekt[]
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

  const result: VirtualItem[] = [];

  for (const [key, items] of ordered) {
    if (key) result.push({ type: "label", title: key });

    const sorted = sortObjekts(items, filters, compareMember, compareSeason, rarityMap);

    let cells: ValidObjekt[][];
    if (filters.grouped) {
      cells = Object.values(
        Object.groupBy(sorted, (objekt) => objekt.collectionId) as Record<string, ValidObjekt[]>,
      );
    } else {
      cells = sorted.map((objekt) => [objekt]);
    }

    if (filters.sort === "duplicate") {
      cells =
        filters.sort_dir === "asc"
          ? cells.toSorted((a, b) => a.length - b.length)
          : cells.toSorted((a, b) => b.length - a.length);
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
