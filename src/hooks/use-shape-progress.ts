import { groupBy } from "es-toolkit";
import { useCallback } from "react";
import { classSort, compareMember, filterObjekts, seasonSort } from "@/lib/filter-utils";
import { validGroupBy } from "@/lib/universal/cosmo/common";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";

export function useShapeProgress<T extends ValidObjekt>() {
  const [filters] = useFilters();
  const { artists, getArtist } = useCosmoArtist();

  return useCallback(
    (data: T[]): [string, T[]][] => {
      let objekts = data;

      objekts = filterObjekts(filters, objekts).filter(
        (a) => ["Welcome", "Zero"].includes(a.class) === false,
      );

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

      return (
        Object.entries(grouped)
          .filter(([, objekts]) => objekts.length > 0)
          // sort by member -> season -> class
          .toSorted(([, [objektA]], [, [objektB]]) =>
            groupBys.includes("class") ? classSort(objektA.class, objektB.class) : 0,
          )
          .toSorted(([, [objektA]], [, [objektB]]) =>
            groupBys.includes("season") ? seasonSort(objektB.season, objektA.season) : 0,
          )
          .toSorted(([, [objektA]], [, [objektB]]) =>
            groupBys.includes("member")
              ? compareMember(objektA.member, objektB.member, artists)
              : 0,
          )
          .map(([key, objekts]) => [
            key,
            objekts
              .toSorted((a, b) => compareMember(a.member, b.member, artists))
              .toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo))
              .toSorted((a, b) => seasonSort(b.season, a.season)),
          ])
      );
    },
    [filters, artists, getArtist],
  );
}
