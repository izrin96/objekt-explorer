import { groupBy } from "es-toolkit";
import { useCallback } from "react";
import { classSort, seasonSort } from "@/lib/filter-utils";
import { validGroupBy } from "@/lib/universal/cosmo/common";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useCompareMember } from "./use-objekt-compare-member";

export function useShapeProgress() {
  const [filters] = useFilters();
  const { getArtist } = useCosmoArtist();
  const compareMember = useCompareMember();

  return useCallback(
    (data: ValidObjekt[]): [string, ValidObjekt[][]][] => {
      const objekts = data.filter((a) => ["Welcome", "Zero"].includes(a.class) === false);

      const groupBys = filters.group_bys?.toSorted(
        (a, b) => validGroupBy.indexOf(a) - validGroupBy.indexOf(b),
      ) ?? ["member", "season", "class"];

      const grouped = groupBy(objekts, (objekt) =>
        groupBys
          .map((key) =>
            key === "artist"
              ? (getArtist(objekt.artist)?.title ?? objekt.artist)
              : objekt[key as keyof typeof objekt],
          )
          .join(" "),
      );

      // group sorting
      let entries = Object.entries(grouped).filter(([, objekts]) => objekts.length > 0);

      if (groupBys.includes("class")) {
        entries = entries.toSorted(([, [objektA]], [, [objektB]]) =>
          classSort(objektA.class, objektB.class),
        );
      }

      if (groupBys.includes("season")) {
        entries = entries.toSorted(([, [objektA]], [, [objektB]]) =>
          seasonSort(objektB.season, objektA.season),
        );
      }

      if (groupBys.includes("member")) {
        entries = entries.toSorted(([, [objektA]], [, [objektB]]) =>
          compareMember(objektA.member, objektB.member),
        );
      }

      // objekt sorting
      return entries
        .map(
          ([key, objekts]) =>
            [
              key,
              objekts
                .toSorted((a, b) => compareMember(a.member, b.member))
                .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
                .toSorted((a, b) => seasonSort(a.season, b.season)),
            ] as const,
        )
        .map(([key, objekts]) => [key, Object.values(groupBy(objekts, (a) => a.collectionId))]);
    },
    [filters, getArtist, compareMember],
  );
}
