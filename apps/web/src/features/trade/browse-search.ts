import type { PostType } from "@repo/api/schemas/trade";
import type { ValidArtist } from "@repo/cosmo/types/common";
import * as z from "zod";

import { filterSearchSchema } from "@/features/filters/search-schema";

/** `all` is the absence of `type` */
export const browseSearchSchema = filterSearchSchema.extend({
  type: z.enum(["wtt", "wtb", "wts"]).optional().catch(undefined),
  slug: z.string().min(1).optional().catch(undefined),
  /** Only matches; the server ignores it for a viewer with no list on Trade */
  matches: z
    .preprocess((value) => (value === "1" ? 1 : value), z.literal(1))
    .optional()
    .catch(undefined),
});

export type BrowseSearch = z.infer<typeof browseSearchSchema>;

type Artist = { artistMembers: { name: string }[] };

/**
 * One function for the loader and the view, so both build the same query key: the URL's
 * facets with members in Cosmo's spelling, scoped to the selected artists as Activity is
 * unless the URL names one collection. An `artist` outside the selection is ignored.
 */
export function toBrowseInput(
  search: BrowseSearch,
  artists: readonly Artist[],
  selectedArtistIds: readonly ValidArtist[],
) {
  const memberName = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member.name] as const),
    ),
  );
  const type: PostType = search.type ?? "all";
  // the drawer counts posts for a collection across every artist, so its link must too
  const chosen = search.slug
    ? []
    : (search.artist ?? []).filter((id) => selectedArtistIds.includes(id));
  const artist = search.slug ? [] : chosen.length > 0 ? chosen : [...selectedArtistIds];

  return {
    type,
    slug: search.slug,
    matches: search.matches === 1 ? true : undefined,
    artist,
    member: (search.member ?? []).map((name) => memberName.get(name.toLowerCase()) ?? name),
    season: search.season ?? [],
    class: search.class ?? [],
    on_offline: search.on_offline ?? [],
    collection: search.collection ?? [],
  };
}

export type BrowseInput = ReturnType<typeof toBrowseInput>;
