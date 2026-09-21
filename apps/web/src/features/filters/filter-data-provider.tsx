import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, use, useCallback, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { orpc } from "@/lib/orpc";

type FilterDataContextValue = {
  collections: string[];
  seasons: string[];
  classes: string[];
  compareSeason: (a: string, b: string) => number;
  compareClass: (a: string, b: string) => number;
};

const FilterDataContext = createContext<FilterDataContextValue | null>(null);

export function FilterDataProvider({ children }: PropsWithChildren) {
  const { data } = useSuspenseQuery(orpc.config.getFilterData.queryOptions());
  const { selectedArtistIds, selectedArtistIdSet } = useCosmoArtist();

  const seasons = useMemo(() => {
    const scoped =
      selectedArtistIds.length > 0
        ? data.seasonsMap.filter((a) => selectedArtistIdSet.has(a.artistId))
        : data.seasonsMap;
    return Array.from(new Set(scoped.flatMap((a) => a.seasons)));
  }, [data.seasonsMap, selectedArtistIds, selectedArtistIdSet]);

  const classes = useMemo(() => {
    const scoped =
      selectedArtistIds.length > 0
        ? data.classesMap.filter((a) => selectedArtistIdSet.has(a.artistId))
        : data.classesMap;
    return Array.from(new Set(scoped.flatMap((a) => a.classes)));
  }, [data.classesMap, selectedArtistIds, selectedArtistIdSet]);

  const seasonMap = useMemo(
    () => new Map(seasons.map((season, index) => [season, index])),
    [seasons],
  );
  const classMap = useMemo(() => new Map(classes.map((cls, index) => [cls, index])), [classes]);

  // the server publishes each list in the order it wants them read; anything it
  // does not name sorts last rather than first
  const compareBy = useCallback(
    (order: Map<string, number>) => (a: string, b: string) => {
      const posA = order.get(a) ?? -1;
      const posB = order.get(b) ?? -1;
      if (posA === -1 && posB === -1) return 0;
      if (posA === -1) return 1;
      if (posB === -1) return -1;
      return posA - posB;
    },
    [],
  );

  const compareSeason = useMemo(() => compareBy(seasonMap), [compareBy, seasonMap]);
  const compareClass = useMemo(() => compareBy(classMap), [compareBy, classMap]);

  const value = useMemo(
    () => ({ collections: data.collections, seasons, classes, compareSeason, compareClass }),
    [data.collections, seasons, classes, compareSeason, compareClass],
  );

  return <FilterDataContext value={value}>{children}</FilterDataContext>;
}

export function useFilterData(): FilterDataContextValue {
  const ctx = use(FilterDataContext);
  if (!ctx) throw new Error("useFilterData must be used within FilterDataProvider");
  return ctx;
}
