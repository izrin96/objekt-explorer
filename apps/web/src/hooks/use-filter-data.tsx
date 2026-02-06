"use client";

import type { PropsWithChildren } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";

import { orpc } from "@/lib/orpc/client";

import { useCosmoArtist } from "./use-cosmo-artist";

type FilterDataContextValue = {
  collections: string[];
  seasons: string[];
  classes: string[];
};

const FilterDataContext = createContext<FilterDataContextValue | null>(null);

export function FilterDataProvider({ children }: PropsWithChildren) {
  const { data } = useSuspenseQuery({
    ...orpc.config.getFilterData.queryOptions(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const { selectedArtistIds } = useCosmoArtist();

  const value = useMemo(() => {
    const selectedSeasonMap =
      selectedArtistIds.length > 0
        ? data.seasonsMap.filter((a) => selectedArtistIds.includes(a.artistId))
        : data.seasonsMap;

    const selectedClassMap =
      selectedArtistIds.length > 0
        ? data.classesMap.filter((a) => selectedArtistIds.includes(a.artistId))
        : data.classesMap;

    return {
      collections: data.collections,
      seasons: Array.from(new Set(selectedSeasonMap.flatMap((a) => a.seasons))),
      classes: Array.from(new Set(selectedClassMap.flatMap((a) => a.classes))),
    };
  }, [data, selectedArtistIds]);

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
