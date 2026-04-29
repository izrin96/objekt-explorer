import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@repo/cosmo/types/artists";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useCallback, useContext } from "react";

import { orpc } from "@/lib/orpc/client";

import { useSelectedArtists } from "./use-selected-artists";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
  artistMemberOrderMap: Map<string, number>;
  artistOrderMap: Map<string, number>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

export type CosmoArtistProviderProps = PropsWithChildren;

export function CosmoArtistProvider({ children }: CosmoArtistProviderProps) {
  const { data: artists } = useSuspenseQuery(orpc.config.getArtists.queryOptions());
  const artistMap = new Map(artists.map((artist) => [artist.id.toLowerCase(), artist]));
  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
    ),
  );

  const artistOrderMap = new Map(artists.map((artist, index) => [artist.id, index]));

  const sortedMembers = artists
    .flatMap((artist) => artist.artistMembers.map((member) => ({ member, artistId: artist.id })))
    .toSorted((a, b) => {
      const artistOrderA = artistOrderMap.get(a.artistId) ?? Infinity;
      const artistOrderB = artistOrderMap.get(b.artistId) ?? Infinity;
      if (artistOrderA !== artistOrderB) return artistOrderA - artistOrderB;
      return a.member.order - b.member.order;
    });

  const artistMemberOrderMap = new Map(
    sortedMembers.map(({ member }, index) => [member.name.toLowerCase(), index]),
  );

  return (
    <CosmoArtistContext
      value={{ artists, artistMap, memberMap, artistMemberOrderMap, artistOrderMap }}
    >
      {children}
    </CosmoArtistContext>
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

  const compareMember = useCallback(
    (memberA: string, memberB: string) => {
      const memberAData = ctx.memberMap.get(memberA.toLowerCase());
      const memberBData = ctx.memberMap.get(memberB.toLowerCase());
      const orderA = memberAData?.order ?? -1;
      const orderB = memberBData?.order ?? -1;
      if (orderA === -1 && orderB === -1) return 0;
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    },
    [ctx.memberMap],
  );

  const compareArtistMember = useCallback(
    (memberA: string, memberB: string) => {
      const orderA = ctx.artistMemberOrderMap.get(memberA.toLowerCase()) ?? Infinity;
      const orderB = ctx.artistMemberOrderMap.get(memberB.toLowerCase()) ?? Infinity;
      return orderA - orderB;
    },
    [ctx.artistMemberOrderMap],
  );

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selectedArtistIds,
    selectedArtists,
    getSelectedArtistIds,
    compareMember,
    compareArtistMember,
  };
}
