"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ReactNode, createContext, useCallback, useContext } from "react";

type ContextProps = {
  artists: Map<string, CosmoArtistWithMembersBFF>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = {
  children: ReactNode;
  artists: CosmoArtistWithMembersBFF[];
};

export function CosmoArtistProvider({ children, artists }: ProviderProps) {
  const artistMap = new Map(
    artists.map((artist) => [artist.id.toLowerCase(), artist])
  );
  return (
    <CosmoArtistContext value={{ artists: artistMap }}>
      {children}
    </CosmoArtistContext>
  );
}

export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (!ctx)
    throw new Error("useCosmoArtist must be used within CosmoArtistProvider");

  const getArtist = useCallback(
    (artistName: string) => ctx.artists.get(artistName.toLowerCase()),
    [ctx.artists]
  );

  return {
    getArtist,
  };
}
