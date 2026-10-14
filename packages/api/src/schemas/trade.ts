import * as z from "zod";

import { collectionFiltersSchema } from "./common/filters";

const TRADE_FILTERS = ["all", "mutual", "they_have", "they_want"] as const;
export type TradeFilter = (typeof TRADE_FILTERS)[number];

/** a partner can match on hundreds of collections; past this many per side they are counted, not drawn */
export const CARD_LIMIT = 50;

/** objekts sent per side of a Browse post: enough to fill two lines of thumbnails at the widest layout */
export const PREVIEW_LIMIT = 22;

/** the same for a one-sided post, whose side takes the whole middle column */
export const SOLO_PREVIEW_LIMIT = 46;

const DEFAULT_TRADE_FILTER = "all" satisfies TradeFilter;

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
 * want list open to buying. `trade*` leave sale lists out altogether and are no longer read; open
 * tabs may still.
 */
export type MatchCounts = {
  theyHave: number;
  youHave: number;
  tradeTheyHave: number;
  tradeYouHave: number;
};

/** The mutual score: the smaller of the two counts, sale lists included where buying can answer them. */
export function mutualOf(counts: MatchCounts) {
  return Math.min(counts.theyHave, counts.youHave);
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

const tradeFilterSchema = z.enum(TRADE_FILTERS);

export const forYouInputSchema = z.object({
  filter: tradeFilterSchema.default(DEFAULT_TRADE_FILTER),
  list: z.string().optional(),
});

export const listMatchCountInputSchema = z.object({ slug: z.string() });

/** `forYou: false` skips the For you count, which only tabs loaded before the merge read. */
export const tabCountsInputSchema = z.object({ forYou: z.boolean().default(true) });

export const tabCountsOutputSchema = z.object({
  forYou: z.number().int(),
  mine: z.number().int(),
});

export const tradePartnerInputSchema = z.object({ userId: z.string().min(1) });

const POST_TYPES = ["all", "wtt", "wtb", "wts"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const BROWSE_MATCH_MODES = ["off", "any", "mutual"] as const;
export type BrowseMatchMode = (typeof BROWSE_MATCH_MODES)[number];

const browseFiltersSchema = collectionFiltersSchema.extend({
  type: z.enum(POST_TYPES).default("all"),
  slug: z.string().optional(),
  /** an older tab's Only matches switch; `match` wins when both are sent */
  matches: z.boolean().optional(),
  match: z.enum(BROWSE_MATCH_MODES).optional(),
  /** Compare with: a list slug, read while matching is on */
  list: z.string().min(1).optional(),
});
export type BrowseFilters = z.infer<typeof browseFiltersSchema>;

/** The last person's place in the Mutual ranking, so the next page continues by key, not offset. */
const mutualRankSchema = z.object({
  mutual: z.number().int(),
  sum: z.number().int(),
  at: z.number(),
  userId: z.string().min(1),
});
export type MutualRank = z.infer<typeof mutualRankSchema>;

const feedCursorSchema = z.object({
  bumpedAt: z.iso.datetime({ offset: true }),
  id: z.number().int(),
  rank: mutualRankSchema.optional(),
});
export type FeedCursor = z.infer<typeof feedCursorSchema>;

export const browseInputSchema = browseFiltersSchema.extend({
  cursor: feedCursorSchema.optional(),
});

export const personInputSchema = z.object({
  userId: z.string().min(1),
  list: z.string().min(1).optional(),
});

export const mutualCountInputSchema = z.object({ list: z.string().min(1).optional() });

export const setShowOnTradeInputSchema = z.object({ slug: z.string(), on: z.boolean() });

export const bumpInputSchema = z.object({ slug: z.string() });

export const collectionPostCountsInputSchema = z.object({ slug: z.string() });

/** `data.reason` on a trade partner search the list or mode can't serve. */
export const TRADE_MODE_REFUSALS = [
  "trade_mode_list_type",
  "trade_mode_both_needs_pair",
  "trade_mode_have_to_want",
  "trade_mode_want_to_have",
] as const;
