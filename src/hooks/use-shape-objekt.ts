import { groupBy } from "es-toolkit";
import { useCallback } from "react";
import {
  classSort,
  compareMember,
  filterObjekts,
  type ObjektItem,
  seasonSort,
  sortDuplicate,
  sortObjekts,
} from "@/lib/filter-utils";
import type { PinObjekt, ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { checkFiltering, useFilters } from "./use-filters";

export function useShapeObjekts<T extends ValidObjekt>() {
  const [filters] = useFilters();
  const { artists, getArtist } = useCosmoArtist();

  return useCallback(
    (
      objekts: T[],
      pins: PinObjekt[] = [],
      lockedObjekts: PinObjekt[] = [],
    ): [string, ObjektItem<T[]>[]][] => {
      // 1. filter all
      // 2. group by key
      // 3. sort the group
      // 4. sort the items
      // 5. group by duplicate
      // 6. sort by duplicate
      // 7. map to ObjektItem<T[]>
      // 8. sort pin objekt

      // filter objekts
      const fliteredObjekts = filterObjekts(filters, objekts);

      // group by key
      let groupByKey: Record<string, T[]>;
      if (filters.group_by) {
        groupByKey = groupBy(fliteredObjekts, (objekt) => {
          return filters.group_by === "seasonCollectionNo"
            ? `${objekt.season} ${objekt.collectionNo}`
            : filters.group_by === "artist"
              ? (getArtist(objekt.artist)?.title ?? objekt.artist)
              : objekt[filters.group_by!];
        });
      } else {
        groupByKey = groupBy(fliteredObjekts, () => "");
      }

      // sort the group
      const groupDir = filters.group_dir ?? "desc";
      const groupByKeySorted = Object.entries(groupByKey).toSorted(([keyA], [keyB]) => {
        if (filters.group_by === "member") {
          return groupDir === "asc"
            ? compareMember(keyA, keyB, artists)
            : compareMember(keyB, keyA, artists);
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
        const sortedObjekts = sortObjekts(filters, keyObjekts, artists);

        // group by duplicate
        let group: T[][];
        if (filters.grouped) {
          group = Object.values(groupBy(sortedObjekts, (a) => a.collectionId));
        } else {
          group = sortedObjekts.map((objekt) => [objekt]);
        }

        // sort duplicate objekts
        const sortedDuplicateObjekts = sortDuplicate(filters, group);

        // map T[] to ObjektItem<T[]>
        let items: ObjektItem<T[]>[] = sortedDuplicateObjekts.map((objekts) => {
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
          const isFiltering = checkFiltering(filters);
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
    [filters, artists, getArtist],
  );
}
