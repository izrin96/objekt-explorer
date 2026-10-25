import * as z from "zod";

import { PRICE_HISTORY_RANGES } from "./price-history";

const sortBySchema = z.enum(["price", "createdAt"]);
export type SortBy = z.infer<typeof sortBySchema>;

const sortDirSchema = z.enum(["asc", "desc"]);
export type SortDir = z.infer<typeof sortDirSchema>;

/**
 * Minimal list info for constructing {@link getListLinkOption}.
 * Only includes the fields `getListLinkOption` reads.
 */
const marketListInfoSchema = z.object({
  slug: z.string(),
  profileSlug: z.string().nullable(),
  profile: z
    .object({
      nickname: z.string().nullable(),
      address: z.string(),
    })
    .nullable(),
});

const marketListingSchema = z.object({
  id: z.number(),
  price: z.number().nullable(),
  isQyop: z.boolean(),
  note: z.string().nullable(),
  createdAt: z.string(),
  currency: z.string().nullable(),
  usdPrice: z.number().nullable(),
  serial: z.number().nullable(),
  transferable: z.boolean().nullable(),
  /** null when the list hides serials */
  objektId: z.string().nullable(),
  list: marketListInfoSchema,
});

export type MarketListing = z.infer<typeof marketListingSchema>;

/** The site's own read: whether the list's owner accepts a message started from this row. */
const viewerMarketListingSchema = marketListingSchema.extend({ messageable: z.boolean() });

export type ViewerMarketListing = z.infer<typeof viewerMarketListingSchema>;

const marketSummaryEntrySchema = z.object({
  slug: z.string(),
  count: z.number(),
  /** cheapest listing in USD — null when every listing is QYOP or unpriced */
  minPrice: z.number().nullable(),
  hasQyop: z.boolean(),
  /** unix seconds */
  listedAt: z.number(),
});

export type MarketSummaryEntry = z.infer<typeof marketSummaryEntrySchema>;

export const marketSummaryOutputSchema = z.array(marketSummaryEntrySchema);

/** USD value of one unit of each known currency, keyed by ISO 4217 code */
export const currencyRatesOutputSchema = z.record(z.string(), z.number());

export const marketStatsOutputSchema = z.object({
  total: z.number(),
  /** cheapest listing in USD — null when every listing is QYOP or unpriced */
  floorPrice: z.number().nullable(),
  /** middle priced listing in USD — null when every listing is QYOP or unpriced */
  medianPrice: z.number().nullable(),
  /** dearest listing in USD — null when every listing is QYOP or unpriced */
  maxPrice: z.number().nullable(),
  sellers: z.number(),
});

export type MarketStatsOutput = z.infer<typeof marketStatsOutputSchema>;

export const marketListingsOutputSchema = z.object({
  items: z.array(marketListingSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().optional(),
});

export const viewerMarketListingsOutputSchema = marketListingsOutputSchema.extend({
  items: z.array(viewerMarketListingSchema),
});

export type ViewerMarketListingsOutput = z.infer<typeof viewerMarketListingsOutputSchema>;

export const marketListingsInputSchema = z.object({
  collectionSlug: z.string(),
  sortBy: sortBySchema.default("createdAt"),
  sortDir: sortDirSchema.default("desc"),
  offset: z.coerce.number<number>().int().min(0).default(0),
  limit: z.coerce.number<number>().int().min(1).max(100).default(20),
});

export type MarketListingsInput = z.output<typeof marketListingsInputSchema>;

export const priceHistoryInputSchema = z.object({
  collectionSlug: z.string().max(255),
  range: z.enum(PRICE_HISTORY_RANGES).default("30d"),
});

export const priceHistoryOutputSchema = z.object({
  /** ascending by date, one per UTC day the collection had a priced listing */
  points: z.array(
    z.object({
      date: z.string(),
      floorUsd: z.number(),
      medianUsd: z.number(),
      listingCount: z.number(),
    }),
  ),
  /** the collection's first recorded date and how many days are recorded; null with none */
  tracking: z.object({ since: z.string(), snapshots: z.number() }).nullable(),
});

export type PriceHistoryOutput = z.infer<typeof priceHistoryOutputSchema>;
