import type { CosmoArtistWithMembersBFF } from "@repo/cosmo/types/artists";
import { useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";

import { useFilterData } from "./filter-data-provider";

export type Facets = {
  artists: readonly string[];
  members: readonly string[];
  seasons: readonly string[];
  classes: readonly string[];
  /** deduplicated: one `229Z`, whatever seasons carry it */
  collectionNos: readonly string[];
};

export type MemberGroup = { artist: CosmoArtistWithMembersBFF; members: string[] };

/** neither class is minted as part of a set, so a completion view leaves them out */
export const ETC_CLASSES: readonly string[] = ["Welcome", "Zero"];

/** the eight background colours the catalogue uses most */
export const COLOR_SWATCHES: readonly string[] = [
  "#f7f7f7",
  "#75fb4c",
  "#ffdd00",
  "#ff7477",
  "#33ecfd",
  "#b400ff",
  "#000000",
  "#e6e3e8",
];

/** Scoped to the selected artists, so a facet cannot select rows the scope hid. */
export function useScopedFacets(): { facets: Facets; groups: MemberGroup[] } {
  const { selectedArtists } = useCosmoArtist();
  const { collections, seasons, classes } = useFilterData();

  return useMemo(() => {
    const groups = selectedArtists.map((artist) => ({
      artist,
      members: artist.artistMembers.toSorted((a, b) => a.order - b.order).map((m) => m.name),
    }));

    return {
      facets: {
        artists: selectedArtists.map((artist) => artist.id),
        members: groups.flatMap((group) => group.members),
        seasons,
        classes,
        collectionNos: collections,
      },
      groups,
    };
  }, [selectedArtists, seasons, classes, collections]);
}
