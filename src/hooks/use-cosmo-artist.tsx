"use client";

import { createContext, type PropsWithChildren, useCallback, useContext } from "react";
import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@/lib/universal/cosmo/artists";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  artists: CosmoArtistWithMembersBFF[];
}>;

/*
 * Code from teamreflex/cosmo-web repo
 */
export function CosmoArtistProvider({ children, artists }: ProviderProps) {
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

  const getArtist = useCallback(
    (artistName: string) => ctx.artistMap.get(artistName.toLowerCase()),
    [ctx.artistMap],
  );

  const getMember = useCallback(
    (memberName: string) => ctx.memberMap.get(memberName.toLowerCase()),
    [ctx.memberMap],
  );

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
  };
}
