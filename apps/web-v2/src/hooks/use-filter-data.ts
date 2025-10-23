import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { useCosmoArtist } from "./use-cosmo-artist";

export function useFilterData() {
  const { data } = useSuspenseQuery(
    orpc.filterData.queryOptions({
      staleTime: Infinity,
    }),
  );
  const { selectedArtistIds } = useCosmoArtist();

  const selectedSeasonMap =
    selectedArtistIds.length > 0
      ? data.seasonsMap.filter((a) => selectedArtistIds.includes(a.artistId as ValidArtist))
      : data.seasonsMap;

  const selectedClassMap =
    selectedArtistIds.length > 0
      ? data.classesMap.filter((a) => selectedArtistIds.includes(a.artistId as ValidArtist))
      : data.classesMap;

  return {
    collections: data.collections,
    seasons: Array.from(new Set(selectedSeasonMap.flatMap((a) => a.seasons))),
    classes: Array.from(new Set(selectedClassMap.flatMap((a) => a.classes))),
  };
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
