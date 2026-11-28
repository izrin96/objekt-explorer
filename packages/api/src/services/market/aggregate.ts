import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { CURRENCY_ALIASES } from "@repo/lib/currency";
import { and, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";

import type { MarketSummaryEntry } from "../../schemas/market";
import { notTradeSanctioned } from "../moderation/safety";

export function usdPriceExpr(
  rates: Record<string, number>,
  currency: AnyPgColumn = lists.currency,
  price: AnyPgColumn = listEntries.price,
) {
  const aliased = Object.entries(CURRENCY_ALIASES).flatMap(([alias, code]) =>
    rates[code] === undefined ? [] : [[alias, rates[code]] as const],
  );
  const table = Object.fromEntries(
    [...aliased, ...Object.entries(rates)].filter(([code]) => code !== "USD"),
  );

  if (Object.keys(table).length === 0) {
    console.warn("[market] No currency rates available — prices sorted as-is");
    return sql`${price}`;
  }

  // one jsonb lookup per row: a CASE over ~200 currencies cost seconds on the all-collections summary
  return sql`(${price} * coalesce((${JSON.stringify(table)}::jsonb ->> upper(${currency}))::float8, 1))`;
}

type SaleListCols = {
  listType: AnyPgColumn;
  discoverable: AnyPgColumn;
  userId: AnyPgColumn;
  profileAddress: AnyPgColumn;
};

function shownSaleList(l: SaleListCols) {
  return and(
    eq(l.listType, "sale"),
    eq(l.discoverable, true),
    // a list naming a profile its owner no longer holds would sell under that profile's name
    sql`(${l.profileAddress} IS NULL OR EXISTS (
      SELECT 1 FROM user_address ua
      WHERE ua.address = ${l.profileAddress} AND ua.user_id = ${l.userId}
    ))`,
  );
}

type EntryCols = {
  id: AnyPgColumn;
  price: AnyPgColumn;
  isQyop: AnyPgColumn;
  createdAt: AnyPgColumn;
};

/** Market's order of one seller's listings of a copy: priced by USD, then QYOP, then unpriced; newest first on a tie. */
function listingRank(rates: Record<string, number>, e: EntryCols, currency: AnyPgColumn) {
  const tier = sql`CASE WHEN ${e.isQyop} THEN 1 WHEN ${e.price} IS NULL THEN 2 ELSE 0 END`;
  const usd = sql`coalesce(${usdPriceExpr(rates, currency, e.price)}, 0)`;
  return { tier, usd };
}

const dupEntry = alias(listEntries, "dup_entry");
const dupList = alias(lists, "dup_list");

/**
 * A seller who lists one copy in several sale lists shows once, at its cheapest listing,
 * so counts and prices are per copy. Different sellers of one copy all stay.
 * Hide-serial listings never merge: which one survived would tell which copy they are.
 */
function cheapestOfCopy(rates: Record<string, number>): SQL {
  const mine = listingRank(rates, listEntries, lists.currency);
  const other = listingRank(rates, dupEntry, dupList.currency);
  return sql`NOT EXISTS (
    SELECT 1 FROM ${listEntries} AS ${dupEntry} JOIN ${lists} AS ${dupList} ON ${dupList.id} = ${dupEntry.listId}
    WHERE ${dupEntry.objektId} = ${listEntries.objektId}
      AND ${dupList.userId} = ${lists.userId}
      AND ${dupEntry.id} <> ${listEntries.id}
      AND NOT ${lists.hideSerial}
      AND NOT ${dupList.hideSerial}
      AND ${dupEntry.collectionSlug} IS NOT NULL
      AND ${shownSaleList(dupList)}
      AND (${other.tier}, ${other.usd}, ${listEntries.createdAt}, ${listEntries.id})
        < (${mine.tier}, ${mine.usd}, ${dupEntry.createdAt}, ${dupEntry.id})
  )`;
}

export function countedListings(rates: Record<string, number>) {
  return and(
    shownSaleList(lists),
    isNotNull(listEntries.collectionSlug),
    notTradeSanctioned(sql`${lists.userId}`),
    cheapestOfCopy(rates),
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
      count: sql<number>`count(*)::int`,
      minPrice: sql<number | null>`min(${pricedUsd(rates)})`,
      hasQyop: sql<boolean>`bool_or(${listEntries.isQyop})`,
      listedAt: sql<number>`extract(epoch from max(${listEntries.createdAt}))::int`,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .where(countedListings(rates))
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
    .where(countedListings(rates))
    .groupBy(listEntries.collectionSlug)
    .having(sql`count(${priced}) > 0`);
}
