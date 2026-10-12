import { canBeOnTrade, type ListTypeNew } from "@repo/api/schemas/list";
import { BROWSE_MATCH_MODES, type BrowseMatchMode, type PostType } from "@repo/api/schemas/trade";
import type { ValidArtist } from "@repo/cosmo/types/common";
import * as z from "zod";

import { filterSearchSchema } from "@/features/filters/search-schema";

/** `all` is the absence of `type` */
export const browseSearchSchema = filterSearchSchema.extend({
  type: z.enum(["wtt", "wtb", "wts"]).optional().catch(undefined),
  slug: z.string().min(1).optional().catch(undefined),
  /** An older link's Only matches; `match` wins when both are present */
  matches: z
    .preprocess((value) => (value === "1" ? 1 : value), z.literal(1))
    .optional()
    .catch(undefined),
  match: z.enum(BROWSE_MATCH_MODES).optional().catch(undefined),
  /** Compare with: a list slug */
  list: z.string().min(1).optional().catch(undefined),
  /** the person sheet to open */
  person: z.string().min(1).optional().catch(undefined),
});

export type BrowseSearch = z.infer<typeof browseSearchSchema>;

/** The parameters of the old For you address, as its links carried them. */
export const forYouSearchSchema = z.object({
  match: z.enum(["mutual", "they_want", "they_have"]).optional().catch(undefined),
  list: z.string().min(1).optional().catch(undefined),
  partner: z.string().min(1).optional().catch(undefined),
});

export type ForYouSearch = z.infer<typeof forYouSearchSchema>;

/** Mutual stays Mutual and every other view becomes Any; the one-way views are gone. */
export function forYouToBrowse(search: ForYouSearch): BrowseSearch {
  return {
    match: search.match === "mutual" ? "mutual" : "any",
    list: search.list,
    person: search.partner,
  };
}

/** Whether the viewer has a list that takes part in Trade, and so can match. */
export function canMatchOf(lists: readonly { listTypeNew: ListTypeNew; isProfileBind: boolean }[]) {
  return lists.some((list) => canBeOnTrade(list.listTypeNew, list.isProfileBind));
}

/**
 * The Matches option in force. Without a list that can match it is Off. A link to one
 * collection defaults to Off, so it lists every post the drawer's count promised; otherwise
 * the default is Any.
 */
export function matchModeOf(search: BrowseSearch, canMatch: boolean): BrowseMatchMode {
  if (!canMatch) return "off";
  if (search.match) return search.match;
  if (search.matches === 1) return "any";
  return search.slug ? "off" : "any";
}

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
  canMatch: boolean,
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
  const match = matchModeOf(search, canMatch);

  return {
    type,
    slug: search.slug,
    match,
    list: match === "off" ? undefined : search.list,
    artist,
    member: (search.member ?? []).map((name) => memberName.get(name.toLowerCase()) ?? name),
    season: search.season ?? [],
    class: search.class ?? [],
    on_offline: search.on_offline ?? [],
    collection: search.collection ?? [],
  };
}

export type BrowseInput = ReturnType<typeof toBrowseInput>;
