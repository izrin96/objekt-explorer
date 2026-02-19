"use client";

import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@repo/cosmo/types/artists";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { createContext, type PropsWithChildren, useCallback, useContext } from "react";

import { useSelectedArtists } from "./use-selected-artists";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

export type CosmoArtistProviderProps = PropsWithChildren<{
  artists: CosmoArtistWithMembersBFF[];
}>;

export function CosmoArtistProvider({ children, artists }: CosmoArtistProviderProps) {
  const artistMap = new Map(artists.map((artist) => [artist.id.toLowerCase(), artist]));
  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
    ),
  );
  return (
    <CosmoArtistContext value={{ artists, artistMap, memberMap }}>{children}</CosmoArtistContext>
  );
}

export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (!ctx) throw new Error("useCosmoArtist must be used within CosmoArtistProvider");

  const { data: selectedArtistIds } = useSelectedArtists();

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
      selectedArtistIds.length > 0
        ? artistIds !== null
          ? artistIds.filter((artist) => selectedArtistIds.includes(artist))
          : selectedArtistIds
        : artistIds,
    [selectedArtistIds],
  );

  const selectedArtists =
    selectedArtistIds.length > 0
      ? ctx.artists.filter((a) => selectedArtistIds.includes(a.id))
      : ctx.artists;

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selectedArtistIds,
    selectedArtists,
    getSelectedArtistIds,
  };
}
