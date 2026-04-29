import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit/array";
import { useCallback } from "react";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilterData } from "./use-filter-data";

export type ShapedProgress = [string, [string, ValidObjekt[][]][]][];

export function useShapeProgress() {
  const { compareSeason, compareClass } = useFilterData();
  const { compareMember } = useCosmoArtist();

  return useCallback(
    (data: ValidObjekt[]): ShapedProgress => {
      const objekts = data.filter((a) => !["Welcome", "Zero"].includes(a.class));

      const byMemberSeason = groupBy(objekts, (objekt) => `${objekt.member} ${objekt.season}`);

      let memberSeasonEntries = Object.entries(byMemberSeason).filter(
        ([, objekts]) => objekts.length > 0,
      );

      memberSeasonEntries = memberSeasonEntries.toSorted(([, [objektA]], [, [objektB]]) =>
        compareSeason(objektB?.season ?? "", objektA?.season ?? ""),
      );

      memberSeasonEntries = memberSeasonEntries.toSorted(([, [objektA]], [, [objektB]]) =>
        compareMember(objektA?.member ?? "", objektB?.member ?? ""),
      );

      return memberSeasonEntries.map(([memberSeasonKey, memberSeasonObjekts]) => {
        const byClass = groupBy(memberSeasonObjekts, (objekt) => objekt.class);

        let classEntries = Object.entries(byClass).filter(([, objekts]) => objekts.length > 0);

        classEntries = classEntries.toSorted(([, [objektA]], [, [objektB]]) =>
          compareClass(objektA?.class ?? "", objektB?.class ?? ""),
        );

        const classGroups = classEntries.map(([classKey, classObjekts]) => {
          const sorted = classObjekts
            .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
            .toSorted((a, b) => compareSeason(a.season, b.season));

          return [classKey, Object.values(groupBy(sorted, (a) => a.collectionId))] as [
            string,
            ValidObjekt[][],
          ];
        });

        return [memberSeasonKey, classGroups] as [string, [string, ValidObjekt[][]][]];
      });
    },
    [compareMember, compareSeason, compareClass],
  );
}
