import * as z from "zod";

import { collectionFiltersSchema } from "./common/filters";
import { indexedObjektSchema, ownedObjektSchema } from "./common/objekt";
import { queryBoolean, queryJson } from "./common/query";
import { listTypeSchema } from "./list";
import { ruleDefSchema } from "./list-rule";
import { publicUserSchema } from "./profile";
import { reputationSchema } from "./reputation";
import { POST_KINDS } from "./trade-post";

const TRADE_FILTERS = ["all", "mutual", "they_have", "they_want"] as const;
export type TradeFilter = (typeof TRADE_FILTERS)[number];

/** a partner can match on hundreds of collections; past this many per side they are counted, not drawn */
export const CARD_LIMIT = 50;

/** objekts sent per side of a Browse post: enough to fill two lines of thumbnails at the widest layout */
export const PREVIEW_LIMIT = 22;

/** the same for a one-sided post, whose side takes the whole middle column */
export const SOLO_PREVIEW_LIMIT = 46;

/** Whether `filter` can show anything for these sides: a one-way view needs its own side. */
export function filterFits(filter: TradeFilter, sides: { have: boolean; want: boolean }) {
  switch (filter) {
    case "all":
      return sides.have || sides.want;
    case "mutual":
      return sides.have && sides.want;
    case "they_want":
      return sides.have;
    case "they_have":
      return sides.want;
  }
}

/**
 * A person's counts against the viewer's lists, in collections. A sale list counts only against a
 * want list open to buying. `trade*` are the swap counts over all lists: lists offering swaps
 * against want lists open to swaps, Sell only sales left out. `swap` is what the two can swap
 * inside one post on each side, `swapTheyHave` what they have in that best pairing, and
 * `swapPair` the pairing: the viewer's lists in it and the person's feed post id.
 */
export type MatchCounts = {
  theyHave: number;
  youHave: number;
  tradeTheyHave: number;
  tradeYouHave: number;
  swap: number;
  swapTheyHave: number;
  swapPair: { myListIds: number[]; theirPostId: number } | null;
};

/** The mutual score (Can swap): what the two can swap inside one post on each side. */
export function mutualOf(counts: MatchCounts) {
  return counts.swap;
}

/** Whether `filter` keeps a person with these counts: Mutual on the smaller count, the one-way views on each. */
export function countsFit(filter: TradeFilter, counts: MatchCounts) {
  if (filter === "mutual") return mutualOf(counts) > 0;
  return filterFits(filter, { have: counts.youHave > 0, want: counts.theyHave > 0 });
}

/** The view a list's Matches link opens: Mutual when it compares both ways, else its own way. */
export function fullestFilter(sides: {
  have: boolean;
  want: boolean;
}): Exclude<TradeFilter, "all"> {
  if (sides.have && sides.want) return "mutual";
  return sides.have ? "they_want" : "they_have";
}

export const tabCountsOutputSchema = z.object({ mine: z.number().int() });

export const tradePartnerInputSchema = z.object({ userId: z.string().min(1) });

export const POST_TYPES = ["all", "wtt", "wtb", "wts"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const BROWSE_MATCH_MODES = ["off", "any", "mutual"] as const;
export type BrowseMatchMode = (typeof BROWSE_MATCH_MODES)[number];

const browseFiltersSchema = collectionFiltersSchema.extend({
  type: z.enum(POST_TYPES).default("all"),
  slug: z.string().optional(),
  match: z.enum(BROWSE_MATCH_MODES).optional(),
  /** Compare with: a list slug, read while matching is on */
  list: z.string().min(1).optional(),
});
export type BrowseFilters = z.infer<typeof browseFiltersSchema>;

/** A person's place in the One way ranking: the sum of both counts, last change, then id. */
export type OneWayRank = { sum: number; at: number; userId: string };

/** The Mutual ranking puts the mutual score before the One way tuple. */
export type MutualRank = OneWayRank & { mutual: number };

/**
 * `trade.people` pages by person: `order` names the server's stored order of people and `at` the
 * next place in it; `bumpedAt` and `userId` are the last person's newest bump and id, which go on
 * past a capped order and find the place again in a rebuilt one. `lead` is the `person` that
 * opened the feed, which later pages keep leaving out.
 */
const peopleCursorSchema = z.object({
  bumpedAt: z.iso.datetime({ offset: true }),
  userId: z.string().min(1),
  lead: z.string().min(1).optional(),
  order: z.string().min(1).max(64),
  at: z.number().int().nonnegative(),
});
export type PeopleCursor = z.infer<typeof peopleCursorSchema>;

/** `person` is a user id whose row leads the first page. */
export const peopleInputSchema = browseFiltersSchema.extend({
  person: z.string().min(1).optional(),
  /** `/api/v1` sends the previous page's `nextCursor` as JSON */
  cursor: queryJson(peopleCursorSchema).optional(),
});
export type PeopleInput = z.infer<typeof peopleInputSchema>;

/** people a page of `trade.people` holds */
export const PEOPLE_PAGE_SIZE = 12;

export const personInputSchema = z.object({
  userId: z.string().min(1),
  list: z.string().min(1).optional(),
});

/** One post side's every objekt, for the strip's "+N" dialog; `list` and `mutual` narrow the rings as For you's Compare with does. */
export const sideItemsInputSchema = z.object({
  listId: z.coerce.number<number>().int().positive(),
  list: z.string().min(1).optional(),
  mutual: queryBoolean.optional(),
});
export type SideItemsInput = z.infer<typeof sideItemsInputSchema>;

const addressRefSchema = z.object({ address: z.string(), nickname: z.string().nullable() });

/** What the viewer would do to make a near match count: sell, swap or buy. */
export const nearVerbSchema = z.enum(["sell", "swap", "buy"]);
export type NearVerb = z.infer<typeof nearVerbSchema>;

/** The offer picker's tag on a copy: a near match's verb, or "loose", kept on none of the viewer's lists. */
export type PickerTag = NearVerb | "loose";

/** A side's near matches: never counted, only shown beside the matches. */
const sideNearSchema = z.object({
  verb: nearVerbSchema,
  count: z.number().int(),
  listIds: z.array(z.number().int()),
});
export type SideNear = z.infer<typeof sideNearSchema>;

const previewItemSchema = z.object({
  entryId: z.number().int(),
  slug: z.string(),
  qty: z.number().int(),
  ringed: z.literal(true).optional(),
  near: z.array(z.number().int()).optional(),
});

const feedCollectionsSchema = z.record(
  z.string(),
  z.union([ownedObjektSchema, indexedObjektSchema]),
);

const feedSideSchema = z.object({
  role: z.enum(["have", "want", "sale"]),
  list: z.object({
    id: z.number().int(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    listType: listTypeSchema,
    currency: z.string().nullable(),
    profileSlug: z.string().nullable(),
    profile: addressRefSchema.nullable(),
  }),
  items: z.array(previewItemSchema),
  more: z.number().int(),
  copyCount: z.number().int(),
  others: z.number().int(),
  collectionCount: z.number().int(),
  rules: z.array(
    z.object({
      ruleId: z.number().int(),
      count: z.number().int(),
      matched: z.number().int().nullable(),
      matchedSlugs: z.array(z.string()),
      rule: ruleDefSchema,
    }),
  ),
  near: sideNearSchema.optional(),
});

const postTagSchema = z.enum(["wtt", "wtb", "wts"]);

const feedPostSchema = z.object({
  id: z.number().int(),
  tags: z.array(postTagSchema),
  narrowed: z.boolean(),
  bumpedAt: z.string().nullable(),
  updatedAt: z.string(),
  sides: z.array(feedSideSchema),
  match: z
    .object({
      youHave: z.number().int(),
      youWant: z.number().int(),
      haveListIds: z.array(z.number().int()),
      wantListIds: z.array(z.number().int()),
    })
    .optional(),
  ruleMatches: z.array(
    z.object({
      slug: z.string(),
      ruleId: z.number().int(),
      listId: z.number().int(),
      swap: z.boolean(),
      rule: ruleDefSchema,
    }),
  ),
});

export const peopleOutputSchema = z.object({
  people: z.array(
    z.object({
      userId: z.string(),
      identity: z.object({
        name: z.string(),
        address: z.string().nullable(),
        nickname: z.string().nullable(),
        also: z.array(addressRefSchema),
      }),
      user: publicUserSchema,
      reputation: reputationSchema.nullable(),
      messageable: z.boolean(),
      counts: z
        .object({
          theyHave: z.number().int(),
          youHave: z.number().int(),
          tradeTheyHave: z.number().int(),
          tradeYouHave: z.number().int(),
          swap: z.number().int(),
          swapTheyHave: z.number().int(),
          swapPair: z
            .object({ myListIds: z.array(z.number().int()), theirPostId: z.number().int() })
            .nullable(),
        })
        .optional(),
      posts: z.array(feedPostSchema),
      section: z.enum(["mutual", "oneWay"]).optional(),
    }),
  ),
  nextCursor: peopleCursorSchema.optional(),
  collections: feedCollectionsSchema,
});

export const sideItemsOutputSchema = z.object({
  items: z.array(previewItemSchema),
  more: z.number().int(),
  copyCount: z.number().int(),
  matched: z.number().int(),
  near: sideNearSchema.nullable(),
  collections: feedCollectionsSchema,
});

/** A list page's Show my matches. */
export const listMatchesInputSchema = z.object({ listId: z.number().int().positive() });

export const mutualCountInputSchema = z.object({ list: z.string().min(1).optional() });

/** A post by what it is for and its lists, each by slug; `replaces` names the post being edited by its anchor list's slug. */
export const savePostInputSchema = z.object({
  kind: z.enum(POST_KINDS),
  have: z.string().min(1).nullish(),
  want: z.string().min(1).nullish(),
  sale: z.string().min(1).nullish(),
  alsoPay: z.boolean().default(false),
  /** Sell: whether the sale list takes swaps */
  alsoSwap: z.boolean().default(false),
  unpair: z.boolean().default(false),
  replaces: z.string().min(1).nullish(),
});

/** Any list of the post names it. */
export const takeDownPostInputSchema = z.object({ slug: z.string().min(1) });

export const collectionPostCountsInputSchema = z.object({ slug: z.string() });
export const collectionPostCountsOutputSchema = z.object({
  have: z.number().int(),
  want: z.number().int(),
});

/** `data.reason` on a trade partner search the list or mode can't serve. */
export const TRADE_MODE_REFUSALS = [
  "trade_mode_list_type",
  "trade_mode_both_needs_pair",
  "trade_mode_have_to_want",
  "trade_mode_want_to_have",
] as const;

/** `data.reason` on a refused `trade.savePost`. */
export const TRADE_POST_REFUSALS = [
  "trade_post_list_in_post",
  "trade_post_list_paired",
  "trade_post_needs_profile",
  "trade_post_wrong_type",
  "trade_post_empty",
] as const;
export type TradePostRefusal = (typeof TRADE_POST_REFUSALS)[number];
