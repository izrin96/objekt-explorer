import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit";
import { useCallback } from "react";

import { compareByArray } from "@/lib/filter-utils";

import { useFilterData } from "./use-filter-data";
import { useCompareMember } from "./use-objekt-compare-member";

export type ShapedProgress = [string, [string, ValidObjekt[][]][]][];

export function useShapeProgress() {
  const { seasons, classes } = useFilterData();
  const compareMember = useCompareMember();

  return useCallback(
    (data: ValidObjekt[]): ShapedProgress => {
      const objekts = data.filter((a) => !["Welcome", "Zero"].includes(a.class));

      const byMemberSeason = groupBy(objekts, (objekt) => `${objekt.member} ${objekt.season}`);

      let memberSeasonEntries = Object.entries(byMemberSeason).filter(
        ([, objekts]) => objekts.length > 0,
      );

      memberSeasonEntries = memberSeasonEntries.toSorted(([, [objektA]], [, [objektB]]) =>
        compareByArray(seasons, objektB?.season ?? "", objektA?.season ?? ""),
      );

      memberSeasonEntries = memberSeasonEntries.toSorted(([, [objektA]], [, [objektB]]) =>
        compareMember(objektA?.member ?? "", objektB?.member ?? ""),
      );

      return memberSeasonEntries.map(([memberSeasonKey, memberSeasonObjekts]) => {
        const byClass = groupBy(memberSeasonObjekts, (objekt) => objekt.class);

        let classEntries = Object.entries(byClass).filter(([, objekts]) => objekts.length > 0);

        classEntries = classEntries.toSorted(([, [objektA]], [, [objektB]]) =>
          compareByArray(classes, objektA?.class ?? "", objektB?.class ?? ""),
        );

        const classGroups = classEntries.map(([classKey, classObjekts]) => {
          const sorted = classObjekts
            .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
            .toSorted((a, b) => compareByArray(seasons, a.season, b.season));

          return [classKey, Object.values(groupBy(sorted, (a) => a.collectionId))] as [
            string,
            ValidObjekt[][],
          ];
        });

        return [memberSeasonKey, classGroups] as [string, [string, ValidObjekt[][]][]];
      });
    },
    [compareMember, seasons, classes],
  );
}
