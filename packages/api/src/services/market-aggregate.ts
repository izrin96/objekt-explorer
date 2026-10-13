import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { CURRENCY_ALIASES } from "@repo/lib/currency";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import type { MarketSummaryEntry } from "../schemas/market";
import { notTradeSanctioned } from "./safety";

export function usdPriceExpr(rates: Record<string, number>) {
  const aliased = Object.entries(CURRENCY_ALIASES).flatMap(([alias, code]) =>
    rates[code] === undefined ? [] : [[alias, rates[code]] as const],
  );
  const whens = [...Object.entries(rates), ...aliased]
    .filter(([code]) => code !== "USD")
    .map(
      ([code, rate]) =>
        sql`WHEN upper(${lists.currency}) = ${code} THEN ${listEntries.price} * ${rate}`,
    );

  if (whens.length === 0) {
    console.warn("[market] No currency rates available — prices sorted as-is");
    return listEntries.price;
  }

  return sql`CASE ${sql.join(whens, sql` `)} ELSE ${listEntries.price} END`;
}

export function countedListings() {
  return and(
    eq(lists.listTypeNew, "sale"),
    eq(lists.discoverable, true),
    isNotNull(listEntries.collectionSlug),
    notTradeSanctioned(sql`${lists.userId}`),
  );
}

export function pricedUsd(rates: Record<string, number>) {
  return sql`CASE WHEN ${listEntries.isQyop} OR ${listEntries.price} IS NULL THEN NULL ELSE ${usdPriceExpr(rates)} END`;
}

export async function fetchMarketSummary(
  rates: Record<string, number>,
): Promise<MarketSummaryEntry[]> {
  return db
    .select({
      slug: sql<string>`${listEntries.collectionSlug}`,
      // one row per listing: the same objekt listed in several sale lists counts once each
      count: sql<number>`count(*)::int`,
      minPrice: sql<number | null>`min(${pricedUsd(rates)})`,
      hasQyop: sql<boolean>`bool_or(${listEntries.isQyop})`,
      listedAt: sql<number>`extract(epoch from max(${listEntries.createdAt}))::int`,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .where(countedListings())
    .groupBy(listEntries.collectionSlug);
}

type Executor = Pick<typeof db, "select">;

export type PriceSnapshotRow = {
  slug: string;
  listingCount: number;
  pricedCount: number;
  floorUsd: number;
  medianUsd: number;
};

export async function fetchPriceSnapshot(
  executor: Executor,
  rates: Record<string, number>,
): Promise<PriceSnapshotRow[]> {
  const priced = pricedUsd(rates);

  return executor
    .select({
      slug: sql<string>`${listEntries.collectionSlug}`,
      listingCount: sql<number>`count(*)::int`,
      pricedCount: sql<number>`count(${priced})::int`,
      floorUsd: sql<number>`min(${priced})::float8`,
      medianUsd: sql<number>`(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${priced}))::float8`,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .where(countedListings())
    .groupBy(listEntries.collectionSlug)
    .having(sql`count(${priced}) > 0`);
}
