import type { GridObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import { useMemberColor } from "@/features/filters/member-colors";

import { useChartMembers } from "./member-progress-chart";
import { catalogueTotals, memberProgress, rankableMembers, shapeProgress } from "./shape-progress";

/** every figure the progress tab draws, from the catalogue and the copies the profile holds */
export function useProgressStats(
  catalogue: ValidObjekt[],
  owned: GridObjekt[],
  memberFilter: string[] | undefined,
) {
  const { compareMember } = useCosmoArtist();
  const { compareSeason, compareClass } = useFilterData();
  const memberColor = useMemberColor();

  const ownedSlugs = useMemo(() => new Set(owned.map((objekt) => objekt.slug)), [owned]);
  const ownedBySlug = useMemo(() => Map.groupBy(owned, (objekt) => objekt.slug), [owned]);

  const members = useChartMembers();
  // a unit objekt credits every member on it, so a member filter still leaves
  // the partners with a handful of totals; only the picked members are ranked,
  // and with none picked the former members sit out
  const rankedMembers = useMemo(() => {
    const ranked = rankableMembers(members, memberFilter);
    const picked = memberFilter?.map((name) => name.toLowerCase());
    return picked?.length
      ? ranked.filter((member) => picked.includes(member.name.toLowerCase()))
      : ranked;
  }, [members, memberFilter]);
  const rows = useMemo(
    () => memberProgress(catalogue, ownedSlugs, rankedMembers),
    [catalogue, ownedSlugs, rankedMembers],
  );
  const sections = useMemo(
    () =>
      shapeProgress(catalogue, ownedSlugs, memberFilter, {
        compareMember,
        compareSeason,
        compareClass,
        memberColor,
      }),
    [catalogue, ownedSlugs, memberFilter, compareMember, compareSeason, compareClass, memberColor],
  );

  const totals = catalogueTotals(catalogue, ownedSlugs);
  // a member the catalogue holds nothing for under the current facets is still
  // a bar, but it is neither the best nor the closest to done
  const measured = rows.filter((row) => row.total > 0);
  const best = measured.toSorted((a, b) => b.pct - a.pct || b.total - a.total)[0];
  const closest = measured.toSorted((a, b) => a.total - a.owned - (b.total - b.owned)).slice(0, 3);

  return { ownedBySlug, rows, sections, totals, measured, best, closest };
}
