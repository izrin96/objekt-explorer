import { useSuspenseQuery } from "@tanstack/react-query";
import { type PropsWithChildren, useMemo } from "react";

import { orpc } from "@/lib/orpc";

import { CosmoArtistContext } from "./use-cosmo-artist";

export function CosmoArtistProvider({ children }: PropsWithChildren) {
  const { data: artists } = useSuspenseQuery(orpc.config.getArtists.queryOptions());

  const artistMap = useMemo(
    () => new Map(artists.map((artist) => [artist.id.toLowerCase(), artist])),
    [artists],
  );

  const memberMap = useMemo(
    () =>
      new Map(
        artists.flatMap((artist) =>
          artist.artistMembers.map((member) => [member.name.toLowerCase(), member] as const),
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
