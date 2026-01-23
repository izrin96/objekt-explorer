import type { ValidObjekt } from "@repo/lib/objekts";

import { useCallback } from "react";

import { compareByArray, getSortDate } from "@/lib/filter-utils";
import { isObjektOwned } from "@/lib/objekt-utils";

import { useFilterData } from "./use-filter-data";
import { useFilters } from "./use-filters";
import { useCompareMember } from "./use-objekt-compare-member";

export function useObjektSort() {
  const { seasons } = useFilterData();
  const [filters] = useFilters();
  const compareMember = useCompareMember();

  return useCallback(
    (data: ValidObjekt[]) => {
      let objekts = data;

      const sort = filters.sort ?? "date";
      const sortDir = filters.sort_dir ?? "desc";

      if (sort === "date") {
        if (sortDir === "desc") {
          objekts = objekts.toSorted((a, b) => getSortDate(b) - getSortDate(a));
        } else {
          objekts = objekts.toSorted((a, b) => getSortDate(a) - getSortDate(b));
        }
      } else if (sort === "season" || sort === "collectionNo") {
        // default to member sort (ascending)
        objekts = objekts.toSorted((a, b) => compareMember(a.member, b.member));

        if (sortDir === "asc") {
          objekts = objekts.toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo));
          if (sort === "season") {
            objekts = objekts.toSorted((a, b) => compareByArray(seasons, a.season, b.season));
          }
        } else {
          objekts = objekts.toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo));
          if (sort === "season") {
            objekts = objekts.toSorted((a, b) => compareByArray(seasons, b.season, a.season));
          }
        }
      } else if (sort === "serial") {
        if (sortDir === "desc") {
          objekts = objekts.toSorted((a, b) =>
            isObjektOwned(a) && isObjektOwned(b) ? b.serial - a.serial : 0,
          );
        } else {
          objekts = objekts.toSorted((a, b) =>
            isObjektOwned(a) && isObjektOwned(b) ? a.serial - b.serial : 0,
          );
        }
      } else if (sort === "member") {
        // default to season sort (ascending)
        objekts = objekts
          .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
          .toSorted((a, b) => compareByArray(seasons, a.season, b.season));

        if (sortDir === "asc") {
          objekts = objekts.toSorted((a, b) => compareMember(a.member, b.member));
        } else {
          objekts = objekts.toSorted((a, b) => compareMember(b.member, a.member));
        }
      }

      return objekts;
    },
    [filters, compareMember, seasons],
  );
}
