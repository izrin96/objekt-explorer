import * as z from "zod";

import { collectionFiltersSchema } from "./common/filters";

const TRADE_FILTERS = ["all", "mutual", "they_have", "they_want"] as const;
export type TradeFilter = (typeof TRADE_FILTERS)[number];

/** a partner can match on hundreds of collections; past this many per side they are counted, not drawn */
export const CARD_LIMIT = 50;

/** objekts drawn per side of a trade card; with the +N tile, one row at 1280 px */
export const PREVIEW_LIMIT = 11;

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

export const tradePartnerInputSchema = z.object({ userId: z.string().min(1) });

const POST_TYPES = ["all", "wtt", "wtb", "wts"] as const;
export type PostType = (typeof POST_TYPES)[number];

const browseFiltersSchema = collectionFiltersSchema.extend({
  type: z.enum(POST_TYPES).default("all"),
  slug: z.string().optional(),
  matches: z.boolean().optional(),
});
export type BrowseFilters = z.infer<typeof browseFiltersSchema>;

const feedCursorSchema = z.object({
  bumpedAt: z.iso.datetime({ offset: true }),
  id: z.number().int(),
});
export type FeedCursor = z.infer<typeof feedCursorSchema>;

export const browseInputSchema = browseFiltersSchema.extend({
  cursor: feedCursorSchema.optional(),
});

export const setShowOnTradeInputSchema = z.object({ slug: z.string(), on: z.boolean() });

export const bumpInputSchema = z.object({ slug: z.string() });

export const collectionPostCountsInputSchema = z.object({ slug: z.string() });
