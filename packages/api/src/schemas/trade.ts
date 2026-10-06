import * as z from "zod";

export const TRADE_FILTERS = ["all", "mutual", "they_have", "they_want"] as const;
export type TradeFilter = (typeof TRADE_FILTERS)[number];

/** a partner can match on hundreds of collections; past this many per side they are counted, not drawn */
export const CARD_LIMIT = 50;

export const DEFAULT_TRADE_FILTER = "mutual" satisfies TradeFilter;

export const tradeFilterSchema = z.enum(TRADE_FILTERS);

export const forYouInputSchema = z.object({
  filter: tradeFilterSchema.default(DEFAULT_TRADE_FILTER),
  list: z.string().optional(),
});

export const listMatchCountInputSchema = z.object({ slug: z.string() });

export const tradePartnerInputSchema = z.object({ userId: z.string().min(1) });
