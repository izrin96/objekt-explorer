"use client";

import { createContext, type PropsWithChildren, useCallback, useContext } from "react";
import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { ClassArtist, SeasonArtist } from "@/lib/universal/cosmo/filter-data";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  selectedArtistIds: ValidArtist[];
  season: SeasonArtist[];
  classes: ClassArtist[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  artists: CosmoArtistWithMembersBFF[];
  selectedArtistIds: ValidArtist[];
  season: SeasonArtist[];
  classes: ClassArtist[];
}>;

export function CosmoArtistProvider({
  children,
  artists,
  selectedArtistIds,
  season,
  classes,
}: ProviderProps) {
  const artistMap = new Map(artists.map((artist) => [artist.id.toLowerCase(), artist]));
  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
    ),
  );
  return (
    <CosmoArtistContext
      value={{ artists, artistMap, memberMap, selectedArtistIds, season, classes }}
    >
      {children}
    </CosmoArtistContext>
  );
}

export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (!ctx) throw new Error("useCosmoArtist must be used within CosmoArtistProvider");

  const getArtist = useCallback(
    (artistName: string) => ctx.artistMap.get(artistName.toLowerCase()),
    [ctx.artistMap],
  );

  const getMember = useCallback(
    (memberName: string) => ctx.memberMap.get(memberName.toLowerCase()),
    [ctx.memberMap],
  );

  const getSelectedArtistIds = useCallback(
    (artistIds: ValidArtist[] | null) =>
      ctx.selectedArtistIds.length > 0
        ? artistIds !== null
          ? artistIds.filter((artist) => ctx.selectedArtistIds.includes(artist))
          : ctx.selectedArtistIds
        : artistIds,
    [ctx.selectedArtistIds],
  );

  const selectedArtists =
    ctx.selectedArtistIds.length > 0
      ? ctx.artists.filter((a) => ctx.selectedArtistIds.includes(a.id))
      : ctx.artists;

  const selectedSeason =
    ctx.selectedArtistIds.length > 0
      ? ctx.season.filter((a) => ctx.selectedArtistIds.includes(a.artistId))
      : ctx.season;

  const selectedClass =
    ctx.selectedArtistIds.length > 0
      ? ctx.classes.filter((a) => ctx.selectedArtistIds.includes(a.artistId))
      : ctx.classes;

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selectedArtistIds: ctx.selectedArtistIds,
    selectedArtists,
    getSelectedArtistIds,
    selectedSeason: Array.from(new Set(selectedSeason.flatMap((a) => a.seasons))),
    selectedClass: Array.from(new Set(selectedClass.flatMap((a) => a.classes))),
  };
}
