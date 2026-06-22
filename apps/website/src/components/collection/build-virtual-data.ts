import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit/array";

import { isFiltering, type Filters } from "@/hooks/use-filters";
import { sortObjekts } from "@/lib/filter-utils";
import { isObjektOwned } from "@/lib/objekt-utils";

export type VirtualItem =
  | { type: "label"; title: string }
  | { type: "row"; items: ValidObjekt[][]; rowIndex: number; groupTitle: string }
  | { type: "sentinel" };

export interface BuildVirtualDataConfig {
  objekts: ValidObjekt[];
  filters: Filters;
  columns: number;
  getArtist: (id: string) => { title: string } | undefined;
  compareMember: (a: string, b: string) => number;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
  isProfile?: boolean;
  rarityMap?: Map<string, number>;
  hasNextPage?: boolean;
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
    isProfile = false,
    rarityMap,
  } = config;
  const filtering = isFiltering(filters);

  let groupByKey: Record<string, ValidObjekt[]>;
  if (filters.group_by) {
    groupByKey = groupBy(objekts, (objekt) => {
      return filters.group_by === "seasonCollectionNo"
        ? `${objekt.season} ${objekt.collectionNo}`
        : filters.group_by === "artist"
          ? (getArtist(objekt.artist)?.title ?? objekt.artist)
          : objekt[filters.group_by!];
    });
  } else {
    groupByKey = groupBy(objekts, () => "");
  }

  const groupDir = filters.group_dir ?? "desc";
  const groupByKeySorted = Object.entries(groupByKey).toSorted(([keyA], [keyB]) => {
    if (filters.group_by === "member") {
      return groupDir === "asc" ? compareMember(keyA, keyB) : compareMember(keyB, keyA);
    }
    if (filters.group_by === "class") {
      return groupDir === "asc" ? compareClass(keyA, keyB) : compareClass(keyB, keyA);
    }
    if (filters.group_by === "season") {
      return groupDir === "asc" ? compareSeason(keyA, keyB) : compareSeason(keyB, keyA);
    }
    if (groupDir === "desc") return keyB.localeCompare(keyA);
    return keyA.localeCompare(keyB);
  });

  const result: VirtualItem[] = [];

  for (const [key, items] of groupByKeySorted) {
    if (key) {
      result.push({ type: "label", title: key });
    }

    let sortedItems = sortObjekts(items, filters, compareMember, compareSeason, rarityMap);

    if (!filtering && isProfile && !filters.hidePin) {
      const ownedItems = sortedItems.filter(isObjektOwned);
      sortedItems = [
        ...ownedItems
          .filter((item) => item.isPin === true)
          .toSorted((a, b) => (a.pinOrder && b.pinOrder ? b.pinOrder - a.pinOrder : 0)),
        ...ownedItems.filter((item) => !item.isPin),
      ];
    }

    let grouped: ValidObjekt[][];
    if (filters.grouped) {
      grouped = Object.values(groupBy(sortedItems, (a) => a.collectionId));
    } else {
      grouped = sortedItems.map((objekt) => [objekt]);
    }

    if (filtering && filters.sort === "duplicate") {
      if (filters.sort_dir === "asc") {
        grouped = grouped.toSorted((a, b) => a.length - b.length);
      } else {
        grouped = grouped.toSorted((a, b) => b.length - a.length);
      }
    }

    const rowCount = Math.ceil(grouped.length / columns);
    for (let i = 0; i < rowCount; i++) {
      result.push({
        type: "row",
        items: grouped.slice(i * columns, (i + 1) * columns),
        rowIndex: i,
        groupTitle: key,
      });
    }
  }

  if (config.hasNextPage) {
    result.push({ type: "sentinel" });
  }

  return result;
}
