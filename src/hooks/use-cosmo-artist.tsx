"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
} from "react";

type ContextProps = {
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  artists: CosmoArtistWithMembersBFF[];
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = PropsWithChildren<{
  artists: CosmoArtistWithMembersBFF[];
}>;

export function CosmoArtistProvider({ children, artists }: ProviderProps) {
  const artistMap = new Map(
    artists.map((artist) => [artist.id.toLowerCase(), artist])
  );
  return (
    <CosmoArtistContext value={{ artists, artistMap }}>
      {children}
    </CosmoArtistContext>
  );
}

export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (!ctx)
    throw new Error("useCosmoArtist must be used within CosmoArtistProvider");

  const getArtist = useCallback(
    (artistName: string) => ctx.artistMap.get(artistName.toLowerCase()),
    [ctx.artistMap]
  );

  return {
    getArtist,
    artists: ctx.artists,
  };
}
