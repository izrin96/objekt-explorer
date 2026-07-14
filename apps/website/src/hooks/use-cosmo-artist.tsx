import type { CosmoArtistWithMembersBFF, CosmoMemberBFF } from "@repo/cosmo/types/artists";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo } from "react";

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

  const artistMap = useMemo(
    () => new Map(artists.map((artist) => [artist.id.toLowerCase(), artist])),
    [artists],
  );
  const memberMap = useMemo(
    () =>
      new Map(
        artists.flatMap((artist) =>
          artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
        ),
      ),
    [artists],
  );

  const artistOrderMap = useMemo(
    () => new Map(artists.map((artist, index) => [artist.id, index])),
    [artists],
  );

  const artistMemberOrderMap = useMemo(() => {
    const sortedMembers = artists
      .flatMap((artist) => artist.artistMembers.map((member) => ({ member, artistId: artist.id })))
      .toSorted((a, b) => {
        const artistOrderA = artistOrderMap.get(a.artistId) ?? Infinity;
        const artistOrderB = artistOrderMap.get(b.artistId) ?? Infinity;
        if (artistOrderA !== artistOrderB) return artistOrderA - artistOrderB;
        return a.member.order - b.member.order;
      });

    return new Map(sortedMembers.map(({ member }, index) => [member.name.toLowerCase(), index]));
  }, [artists, artistOrderMap]);

  const value = useMemo(
    () => ({ artists, artistMap, memberMap, artistMemberOrderMap, artistOrderMap }),
    [artists, artistMap, memberMap, artistMemberOrderMap, artistOrderMap],
  );

  return <CosmoArtistContext value={value}>{children}</CosmoArtistContext>;
}

export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (!ctx) throw new Error("useCosmoArtist must be used within CosmoArtistProvider");

  const { data: selectedArtistIds } = useSelectedArtists();
  const selectedArtistIdSet = useMemo(() => new Set(selectedArtistIds), [selectedArtistIds]);

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
          ? artistIds.filter((artist) => selectedArtistIdSet.has(artist))
          : selectedArtistIds
        : artistIds,
    [selectedArtistIds, selectedArtistIdSet],
  );

  const selectedArtists = useMemo(
    () =>
      selectedArtistIds.length > 0
        ? ctx.artists.filter((a) => selectedArtistIdSet.has(a.id))
        : ctx.artists,
    [ctx.artists, selectedArtistIds, selectedArtistIdSet],
  );

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

  return useMemo(
    () => ({
      artists: ctx.artists,
      getArtist,
      getMember,
      selectedArtistIds,
      selectedArtistIdSet,
      selectedArtists,
      getSelectedArtistIds,
      compareMember,
      compareArtistMember,
    }),
    [
      ctx.artists,
      getArtist,
      getMember,
      selectedArtistIds,
      selectedArtistIdSet,
      selectedArtists,
      getSelectedArtistIds,
      compareMember,
      compareArtistMember,
    ],
  );
}
