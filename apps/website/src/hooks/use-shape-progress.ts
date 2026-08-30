import type { ValidObjekt } from "@repo/lib/types/objekt";
import { groupBy } from "es-toolkit/array";
import { useCallback } from "react";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilterData } from "./use-filter-data";
import { useFilters } from "./use-filters";

export type ShapedProgress = [string, [string, ValidObjekt[][]][]][];

type MemberEntry = { member: string; objekt: ValidObjekt };

export function useShapeProgress() {
  const { compareSeason, compareClass } = useFilterData();
  const { compareMember } = useCosmoArtist();
  const [filters] = useFilters();

  return useCallback(
    (data: ValidObjekt[]): ShapedProgress => {
      const objekts = data.filter((a) => !["Welcome", "Zero"].includes(a.class));

      const selectedMembers = filters.member;
      const entries: MemberEntry[] = objekts.flatMap((objekt) => {
        const matched =
          selectedMembers && selectedMembers.length > 0
            ? objekt.members.filter((m) => selectedMembers.includes(m))
            : [];
        const members = matched.length > 0 ? matched : [objekt.member];
        return members.map((member) => ({ member, objekt }));
      });

      const byMemberSeason = groupBy(entries, ({ member, objekt }) => `${member} ${objekt.season}`);

      let memberSeasonGroups = Object.entries(byMemberSeason).filter(
        ([, group]) => group.length > 0,
      );

      memberSeasonGroups = memberSeasonGroups.toSorted(([, [entryA]], [, [entryB]]) =>
        compareSeason(entryB?.objekt.season ?? "", entryA?.objekt.season ?? ""),
      );

      memberSeasonGroups = memberSeasonGroups.toSorted(([, [entryA]], [, [entryB]]) =>
        compareMember(entryA?.member ?? "", entryB?.member ?? ""),
      );

      return memberSeasonGroups.map(([memberSeasonKey, group]) => {
        const memberSeasonObjekts = group.map(({ objekt }) => objekt);
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
    [compareMember, compareSeason, compareClass, filters.member],
  );
}
