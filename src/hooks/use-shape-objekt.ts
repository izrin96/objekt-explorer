import { groupBy } from "es-toolkit";
import { useCallback } from "react";
import { classSort, type ObjektItem, seasonSort } from "@/lib/filter-utils";
import type { PinObjekt, ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters, useIsFiltering } from "./use-filters";
import { useCompareMember } from "./use-objekt-compare-member";
import { useObjektSort } from "./use-objekt-sort";

export function useShapeObjekts() {
  const [filters] = useFilters();
  const isFiltering = useIsFiltering();
  const { getArtist } = useCosmoArtist();
  const compareMember = useCompareMember();
  const sortObjekts = useObjektSort();

  return useCallback(
    (
      objekts: ValidObjekt[],
      pins: PinObjekt[] = [],
      lockedObjekts: PinObjekt[] = [],
    ): [string, ObjektItem<ValidObjekt[]>[]][] => {
      // 1. filter all
      // 2. group by key
      // 3. sort the group
      // 4. sort the items
      // 5. group by duplicate
      // 6. sort by duplicate
      // 7. map to ObjektItem<T[]>
      // 8. sort pin objekt

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
          return groupDir === "asc" ? classSort(keyA, keyB) : classSort(keyB, keyA);
        }

        if (filters.group_by === "season") {
          return groupDir === "asc" ? seasonSort(keyA, keyB) : seasonSort(keyB, keyA);
        }

        if (groupDir === "desc") return keyB.localeCompare(keyA);
        return keyA.localeCompare(keyB);
      });

      return groupByKeySorted.map(([key, keyObjekts]) => {
        // sort objekts
        const sortedObjekts = sortObjekts(keyObjekts);

        // group by duplicate
        let group: ValidObjekt[][];
        if (filters.grouped) {
          group = Object.values(groupBy(sortedObjekts, (a) => a.collectionId));
        } else {
          group = sortedObjekts.map((objekt) => [objekt]);
        }

        // sort duplicate objekts
        if (filters.sort === "duplicate") {
          if (filters.sort_dir === "asc") {
            group = group.toSorted((a, b) => a.length - b.length);
          } else {
            group = group.toSorted((a, b) => b.length - a.length);
          }
        }

        // map T[] to ObjektItem<T[]>
        let items: ObjektItem<ValidObjekt[]>[] = group.map((objekts) => {
          const [objekt] = objekts;
          const pinObjekt = pins.find((pin) => pin.tokenId === objekt.id);
          const lockedObjekt = lockedObjekts.find((lock) => lock.tokenId === objekt.id);
          const isPin = pinObjekt !== undefined;
          const isLocked = lockedObjekt !== undefined;
          return {
            isPin: isPin,
            isLocked: isLocked,
            item: objekts,
            order: isPin ? pinObjekt.order : null,
          };
        });

        if (pins.length > 0) {
          // if not filtering, pins should show first
          if (!isFiltering && !filters.hidePin) {
            items = [
              ...items
                .filter((item) => item.isPin === true)
                .toSorted((a, b) => (a.order && b.order ? b.order - a.order : 0)),
              ...items.filter((item) => item.isPin === false),
            ];
          }
        }

        // filter locked / unlocked
        if (filters.locked !== null) {
          items = items.filter((item) =>
            filters.locked !== null ? item.isLocked === filters.locked : true,
          );
        }

        return [key, items];
      });
    },
    [filters, isFiltering, getArtist, compareMember, sortObjekts],
  );
}
