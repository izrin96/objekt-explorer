import { canBeOnTrade, type ListTypeNew } from "@repo/api/schemas/list";
import { BROWSE_MATCH_MODES, type BrowseMatchMode, type PostType } from "@repo/api/schemas/trade";
import type { ValidArtist } from "@repo/cosmo/types/common";
import * as z from "zod";

import { filterSearchSchema } from "@/features/filters/search-schema";

/** What both Trade surfaces take: the filters, the post type and the person sheet. */
const feedSearchSchema = filterSearchSchema.extend({
  /** `all` is the absence of `type` */
  type: z.enum(["wtt", "wtb", "wts"]).optional().catch(undefined),
  slug: z.string().min(1).optional().catch(undefined),
  /** the person sheet to open */
  person: z.string().min(1).optional().catch(undefined),
});

export const browseSearchSchema = feedSearchSchema.extend({
  /** read only to redirect to For you; `match` wins when both are present */
  matches: z
    .preprocess((value) => (value === "1" ? 1 : value), z.literal(1))
    .optional()
    .catch(undefined),
  match: z.enum(BROWSE_MATCH_MODES).optional().catch(undefined),
  /** Compare with: a list slug */
  list: z.string().min(1).optional().catch(undefined),
});

export type BrowseSearch = z.infer<typeof browseSearchSchema>;

/** For you: Browse's filters, Mutual only (`match`), Compare with (`list`). */
export const forYouSearchSchema = feedSearchSchema.extend({
  /** `they_*` read as Any */
  match: z.enum(["any", "mutual", "they_have", "they_want"]).optional().catch(undefined),
  list: z.string().min(1).optional().catch(undefined),
  /** read as `person` */
  partner: z.string().min(1).optional().catch(undefined),
});

export type ForYouSearch = z.infer<typeof forYouSearchSchema>;

/** Where an old `/trade` link belongs, or `null` when it is already in its place. */
export type BrowseRedirect =
  | { to: "/trade/for-you"; search: Omit<ForYouSearch, "partner"> }
  | { to: "/trade"; search: Omit<BrowseSearch, "match" | "matches" | "list"> };

/**
 * Matching lives on For you: `match=any|mutual` and `matches=1` go there, `match=off` and a
 * stray `list` are dropped. `match` wins over `matches`.
 */
export function browseRedirect(search: BrowseSearch): BrowseRedirect | null {
  const { match, matches, list, ...rest } = search;
  if (match === "off") return { to: "/trade", search: rest };
  if (match === "any" || match === "mutual") {
    return { to: "/trade/for-you", search: { ...rest, match, list } };
  }
  if (matches === 1) return { to: "/trade/for-you", search: { ...rest, match: "any", list } };
  if (list !== undefined) return { to: "/trade", search: rest };
  return null;
}

/** Maps `they_*` to Any and `partner` to `person`, or `null` when there is nothing to map. */
export function forYouNormalise(search: ForYouSearch): Omit<ForYouSearch, "partner"> | null {
  const { partner, ...rest } = search;
  const oneWay = rest.match === "they_have" || rest.match === "they_want";
  if (partner === undefined && !oneWay) return null;
  return {
    ...rest,
    match: oneWay ? "any" : rest.match,
    person: rest.person ?? partner,
  };
}

/** For you's address for a viewer who can't use it: the filters, with no matching state. */
export function forYouFallback(
  search: FeedSearch & { partner?: string },
): Omit<BrowseSearch, "match" | "matches" | "list"> {
  // a person sheet opens on Browse too, so a shared link keeps it
  const { match, list, partner, ...rest } = search;
  const person = rest.person ?? partner;
  return person === undefined ? rest : { ...rest, person };
}

/** Whether the viewer has a list that takes part in Trade, and so can match. */
export function canMatchOf(lists: readonly { listTypeNew: ListTypeNew; isProfileBind: boolean }[]) {
  return lists.some((list) => canBeOnTrade(list.listTypeNew, list.isProfileBind));
}

/** For you's Matches option: Any unless the URL says Mutual. */
export function matchModeOf(search: { match?: string }): "any" | "mutual" {
  return search.match === "mutual" ? "mutual" : "any";
}

/**
 * The Type in force. Mutual is a swap between two people, and a WTB or WTS post is one-way
 * money, so Mutual lists WTT posts only, whatever `type` says.
 */
export function postTypeOf(search: FeedSearch, surface: Surface): PostType {
  const mutual = surface === "forYou" && matchModeOf(search) === "mutual";
  return mutual ? "wtt" : (search.type ?? "all");
}

export type Surface = "browse" | "forYou";

/** What both surfaces read: Browse's schema is a wider `match`, For you's a narrower one. */
export type FeedSearch = Omit<BrowseSearch, "match" | "matches"> & { match?: string };

type Artist = { artistMembers: { name: string }[] };

/**
 * One function for the loader and the view, so both build the same query key: the URL's
 * facets with members in Cosmo's spelling, scoped to the selected artists as Activity is
 * unless the URL names one collection. An `artist` outside the selection is ignored.
 */
export function toBrowseInput(
  search: FeedSearch,
  artists: readonly Artist[],
  selectedArtistIds: readonly ValidArtist[],
  surface: Surface,
) {
  const memberName = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member.name] as const),
    ),
  );
  const type = postTypeOf(search, surface);
  // the drawer counts posts for a collection across every artist, so its link must too
  const chosen = search.slug
    ? []
    : (search.artist ?? []).filter((id) => selectedArtistIds.includes(id));
  const artist = search.slug ? [] : chosen.length > 0 ? chosen : [...selectedArtistIds];
  const match: BrowseMatchMode = surface === "browse" ? "off" : matchModeOf(search);

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
