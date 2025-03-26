"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useRef,
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
  const artistsRef = useRef(artists);
  const artistMap = useRef(
    new Map(artists.map((artist) => [artist.id.toLowerCase(), artist]))
  );
  return (
    <CosmoArtistContext
      value={{ artists: artistsRef.current, artistMap: artistMap.current }}
    >
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
