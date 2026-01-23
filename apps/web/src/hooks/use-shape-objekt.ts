import type { ValidObjekt } from "@repo/lib/objekts";

import { groupBy } from "es-toolkit";
import { useCallback } from "react";

import { compareByArray } from "@/lib/filter-utils";
import { isObjektOwned } from "@/lib/objekt-utils";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilterData } from "./use-filter-data";
import { useFilters, useIsFiltering } from "./use-filters";
import { useCompareMember } from "./use-objekt-compare-member";
import { useObjektSort } from "./use-objekt-sort";

export function useShapeObjekts() {
  const { seasons, classes } = useFilterData();
  const [filters] = useFilters();
  const isFiltering = useIsFiltering();
  const { getArtist } = useCosmoArtist();
  const compareMember = useCompareMember();
  const sortObjekts = useObjektSort();

  return useCallback(
    (objekts: ValidObjekt[], isProfile: boolean = false): [string, ValidObjekt[][]][] => {
      // - group by key
      // - sort the group
      // - sort the items
      // - sort pin objekt
      // - group by duplicate
      // - sort by duplicate

      // group by key
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

      // sort the group
      const groupDir = filters.group_dir ?? "desc";
      const groupByKeySorted = Object.entries(groupByKey).toSorted(([keyA], [keyB]) => {
        if (filters.group_by === "member") {
          return groupDir === "asc" ? compareMember(keyA, keyB) : compareMember(keyB, keyA);
        }

        if (filters.group_by === "class") {
          return groupDir === "asc"
            ? compareByArray(classes, keyA, keyB)
            : compareByArray(classes, keyB, keyA);
        }

        if (filters.group_by === "season") {
          return groupDir === "asc"
            ? compareByArray(seasons, keyA, keyB)
            : compareByArray(seasons, keyB, keyA);
        }

        if (groupDir === "desc") return keyB.localeCompare(keyA);
        return keyA.localeCompare(keyB);
      });

      return groupByKeySorted.map(([key, items]) => {
        // sort objekts
        items = sortObjekts(items);

        // sort pin
        // if not filtering, pins should show first
        if (!isFiltering && isProfile && !filters.hidePin) {
          const ownedItems = items.filter(isObjektOwned);
          items = [
            ...ownedItems
              .filter((item) => item.isPin === true)
              .toSorted((a, b) => (a.pinOrder && b.pinOrder ? b.pinOrder - a.pinOrder : 0)),
            ...ownedItems.filter((item) => item.isPin === false),
          ];
        }

        // group by duplicate
        let grouped: ValidObjekt[][];
        if (filters.grouped) {
          grouped = Object.values(groupBy(items, (a) => a.collectionId));
        } else {
          grouped = items.map((objekt) => [objekt]);
        }

        // sort duplicate objekts
        if (isFiltering && filters.sort === "duplicate") {
          if (filters.sort_dir === "asc") {
            grouped = grouped.toSorted((a, b) => a.length - b.length);
          } else {
            grouped = grouped.toSorted((a, b) => b.length - a.length);
          }
        }

        return [key, grouped];
      });
    },
    [filters, isFiltering, getArtist, compareMember, sortObjekts, seasons, classes],
  );
}
