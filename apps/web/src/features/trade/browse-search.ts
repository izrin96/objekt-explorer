import type { PostType } from "@repo/api/schemas/trade";
import type { ValidArtist } from "@repo/cosmo/types/common";
import * as z from "zod";

import { filterSearchSchema } from "@/features/filters/search-schema";

/** `all` is the absence of `type` and of `match` */
export const browseSearchSchema = filterSearchSchema.extend({
  type: z.enum(["wtt", "wtb", "wts"]).optional().catch(undefined),
  match: z.enum(["mutual", "they_want", "they_have"]).optional().catch(undefined),
  slug: z.string().min(1).optional().catch(undefined),
});

export type BrowseSearch = z.infer<typeof browseSearchSchema>;

type Artist = { artistMembers: { name: string }[] };

/**
 * One function for the loader and the view, so both build the same query key: the URL's
 * facets with members in Cosmo's spelling, scoped to the selected artists as Activity is
 * unless the URL names one collection.
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
  const scope = search.slug ? [] : selectedArtistIds;
  const artist =
    scope.length === 0
      ? (search.artist ?? [])
      : search.artist
        ? search.artist.filter((id) => scope.includes(id))
        : [...scope];

  return {
    type,
    match: search.match ?? ("all" as const),
    slug: search.slug,
    artist,
    member: (search.member ?? []).map((name) => memberName.get(name.toLowerCase()) ?? name),
    season: search.season ?? [],
    class: search.class ?? [],
    on_offline: search.on_offline ?? [],
    collection: search.collection ?? [],
  };
}

export type BrowseInput = ReturnType<typeof toBrowseInput>;
