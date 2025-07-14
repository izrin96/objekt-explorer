"use client";

import { createContext, type PropsWithChildren, useCallback, useContext } from "react";
import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
  selectedArtistIds: ValidArtist[];
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  artists: CosmoArtistWithMembersBFF[];
  selectedArtistIds: ValidArtist[];
}>;

export function CosmoArtistProvider({ children, artists, selectedArtistIds }: ProviderProps) {
  const artistMap = new Map(artists.map((artist) => [artist.id.toLowerCase(), artist]));
  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
    ),
  );
  return (
    <CosmoArtistContext value={{ artists, artistMap, memberMap, selectedArtistIds }}>
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

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selectedArtistIds: ctx.selectedArtistIds,
    selectedArtists,
    getSelectedArtistIds,
  };
}
