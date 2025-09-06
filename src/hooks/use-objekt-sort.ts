import { useCallback } from "react";
import { getSortDate, seasonSort } from "@/lib/filter-utils";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { useFilters } from "./use-filters";
import { useCompareMember } from "./use-objekt-compare-member";

export function useObjektSort() {
  const [filters] = useFilters();
  const compareMember = useCompareMember();

  return useCallback(
    (data: ValidObjekt[]) => {
      // default sort and season sort
      let objekts = data
        .toSorted((a, b) => compareMember(a.member, b.member))
        .toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo))
        .toSorted((a, b) => seasonSort(b.season, a.season));

      const sort = filters.sort ?? "date";
      const sortDir = filters.sort_dir ?? "desc";

      if (sort === "date") {
        if (sortDir === "desc") {
          objekts = objekts.toSorted((a, b) => getSortDate(b) - getSortDate(a));
        } else {
          objekts = objekts.toSorted((a, b) => getSortDate(a) - getSortDate(b));
        }
      } else if (sort === "season") {
        // for desc, use default
        if (sortDir === "asc") {
          // sort by season -> collectionNo
          objekts = objekts
            .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
            .toSorted((a, b) => seasonSort(a.season, b.season));
        }
      } else if (sort === "collectionNo") {
        if (sortDir === "desc") {
          objekts = objekts.toSorted((a, b) => b.collectionNo.localeCompare(a.collectionNo));
        } else {
          objekts = objekts.toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo));
        }
      } else if (sort === "serial") {
        if (sortDir === "desc") {
          objekts = objekts.toSorted((a, b) =>
            "serial" in a && "serial" in b ? b.serial - a.serial : 0,
          );
        } else {
          objekts = objekts.toSorted((a, b) =>
            "serial" in a && "serial" in b ? a.serial - b.serial : 0,
          );
        }
      } else if (sort === "member") {
        objekts = objekts.toSorted((a, b) => {
          return sortDir === "asc"
            ? compareMember(a.member, b.member)
            : compareMember(b.member, a.member);
        });
      }

      return objekts;
    },
    [filters, compareMember],
  );
}
