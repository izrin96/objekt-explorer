import { useSuspenseQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";

import { orpc } from "@/lib/orpc/client";

import { useCosmoArtist } from "./use-cosmo-artist";

type FilterDataContextValue = {
  collections: string[];
  seasons: string[];
  seasonMap: Map<string, number>;
  classes: string[];
  classMap: Map<string, number>;
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
};

const FilterDataContext = createContext<FilterDataContextValue | null>(null);

type Props = PropsWithChildren;

export function FilterDataProvider({ children }: Props) {
  const { data } = useSuspenseQuery(orpc.config.getFilterData.queryOptions());
  const { selectedArtistIds, selectedArtistIdSet } = useCosmoArtist();

  const selectedSeasonMap = useMemo(
    () =>
      selectedArtistIds.length > 0
        ? data.seasonsMap.filter((a) => selectedArtistIdSet.has(a.artistId))
        : data.seasonsMap,
    [data.seasonsMap, selectedArtistIds, selectedArtistIdSet],
  );

  const selectedClassMap = useMemo(
    () =>
      selectedArtistIds.length > 0
        ? data.classesMap.filter((a) => selectedArtistIdSet.has(a.artistId))
        : data.classesMap,
    [data.classesMap, selectedArtistIds, selectedArtistIdSet],
  );

  const seasons = useMemo(
    () => Array.from(new Set(selectedSeasonMap.flatMap((a) => a.seasons))),
    [selectedSeasonMap],
  );
  const seasonMap = useMemo(
    () => new Map(seasons.map((season, index) => [season, index])),
    [seasons],
  );
  const classes = useMemo(
    () => Array.from(new Set(selectedClassMap.flatMap((a) => a.classes))),
    [selectedClassMap],
  );
  const classMap = useMemo(() => new Map(classes.map((cls, index) => [cls, index])), [classes]);

  const compareSeason = useCallback(
    (a: string, b: string) => {
      const posA = seasonMap.get(a) ?? -1;
      const posB = seasonMap.get(b) ?? -1;
      if (posA === -1 && posB === -1) return 0;
      if (posA === -1) return 1;
      if (posB === -1) return -1;
      return posA - posB;
    },
    [seasonMap],
  );

  const compareClass = useCallback(
    (a: string, b: string) => {
      const posA = classMap.get(a) ?? -1;
      const posB = classMap.get(b) ?? -1;
      if (posA === -1 && posB === -1) return 0;
      if (posA === -1) return 1;
      if (posB === -1) return -1;
      return posA - posB;
    },
    [classMap],
  );

  const value = useMemo(
    () => ({
      collections: data.collections,
      seasons,
      seasonMap,
      classes,
      classMap,
      compareSeason,
      compareClass,
    }),
    [data.collections, seasons, seasonMap, classes, classMap, compareSeason, compareClass],
  );

  return <FilterDataContext value={value}>{children}</FilterDataContext>;
}

export function useFilterData(): FilterDataContextValue {
  const ctx = useContext(FilterDataContext);
  if (!ctx) throw new Error("useFilterData must be used within FilterDataProvider");
  return ctx;
}

export type FilterData = {
  collections: string[];
  seasonsMap: {
    artistId: string;
    seasons: string[];
  }[];
  classesMap: {
    artistId: string;
    classes: string[];
  }[];
};
