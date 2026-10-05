import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import { CURRENCY_ALIASES, normalizeCurrency } from "@repo/lib/currency";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { pub } from "../orpc";
import { collectionSlugInputSchema } from "../schemas/common/collection";
import { documented } from "../schemas/common/documented";
import {
  type MarketListing,
  type MarketListingsOutput,
  type MarketStatsOutput,
  type MarketSummaryEntry,
  currencyRatesOutputSchema,
  marketListingsInputSchema,
  marketListingsOutputSchema,
  marketStatsOutputSchema,
  marketSummaryOutputSchema,
} from "../schemas/market";
import { getUsdRates } from "../services/currency-rates";
import { getCache } from "../services/redis";

const SUMMARY_TTL = 60;

async function fetchObjektMap(
  objektIds: string[],
): Promise<Map<string, { serial: number | null; transferable: boolean | null }>> {
  if (objektIds.length === 0) return new Map();

  const rows = await indexer
    .select({
      id: objekts.id,
      serial: objekts.serial,
      transferable: objekts.transferable,
    })
    .from(objekts)
    .where(inArray(objekts.id, objektIds));

  return new Map(rows.map((o) => [o.id, o]));
}

function usdPriceExpr(rates: Record<string, number>) {
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

function listingsWhere(collectionSlug: string) {
  return and(
    eq(listEntries.collectionSlug, collectionSlug),
    eq(lists.listTypeNew, "sale"),
    eq(lists.discoverable, true),
  );
}

async function fetchMarketSummary(): Promise<MarketSummaryEntry[]> {
  const rates = await getUsdRates();
  const usdPrice = usdPriceExpr(rates);

  const rows = await db
    .select({
      slug: sql<string>`${listEntries.collectionSlug}`,
      // one row per listing: the same objekt listed in several sale lists counts once each
      count: sql<number>`count(*)::int`,
      minPrice: sql<
        number | null
      >`min(CASE WHEN ${listEntries.isQyop} OR ${listEntries.price} IS NULL THEN NULL ELSE ${usdPrice} END)`,
      hasQyop: sql<boolean>`bool_or(${listEntries.isQyop})`,
      listedAt: sql<number>`extract(epoch from max(${listEntries.createdAt}))::int`,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .where(
      and(
        eq(lists.listTypeNew, "sale"),
        eq(lists.discoverable, true),
        isNotNull(listEntries.collectionSlug),
      ),
    )
    .groupBy(listEntries.collectionSlug);

  return rows;
}

export const marketRouter = {
  summary: pub
    .route({
      method: "GET",
      path: "/market",
      tags: ["Market"],
      summary: "Every collection on sale, with its listing count and floor price",
    })
    .output(documented(marketSummaryOutputSchema))
    .handler(async () => {
      try {
        return await getCache("market:summary", SUMMARY_TTL, fetchMarketSummary);
      } catch {
        console.warn("[market] Redis unavailable, falling back to direct DB query");
        return fetchMarketSummary();
      }
    }),

  marketListings: pub
    .route({
      method: "GET",
      path: "/market/{collectionSlug}/listings",
      tags: ["Market"],
      summary: "One collection's listings, by price or by date",
    })
    .input(marketListingsInputSchema)
    .output(documented(marketListingsOutputSchema))
    .handler(async ({ input }) => {
      const rates = await getUsdRates();

      const where = listingsWhere(input.collectionSlug);

      const baseQuery = () =>
        db
          .select({
            id: listEntries.id,
            price: listEntries.price,
            isQyop: listEntries.isQyop,
            note: listEntries.note,
            createdAt: listEntries.createdAt,
            objektId: listEntries.objektId,
            hideSerial: lists.hideSerial,
            currency: lists.currency,
            slug: lists.slug,
            profileSlug: lists.profileSlug,
            profileAddress: lists.profileAddress,
            ownerNickname: userAddress.nickname,
            ownerHideNickname: userAddress.hideNickname,
          })
          .from(listEntries)
          .innerJoin(lists, eq(listEntries.listId, lists.id))
          .leftJoin(userAddress, eq(lists.profileAddress, userAddress.address))
          .where(where);

      const dir = input.sortDir === "desc" ? desc : asc;

      const paginatedRows =
        input.sortBy === "price"
          ? await baseQuery()
              .orderBy(
                sql`CASE WHEN ${listEntries.isQyop} THEN 1 WHEN ${listEntries.price} IS NULL THEN 2 ELSE 0 END`,
                dir(usdPriceExpr(rates)),
              )
              .offset(input.offset)
              .limit(input.limit + 1)
          : await baseQuery()
              .orderBy(dir(listEntries.createdAt))
              .offset(input.offset)
              .limit(input.limit + 1);

      const hasMore = paginatedRows.length > input.limit;
      const rows = hasMore ? paginatedRows.slice(0, input.limit) : paginatedRows;
      const nextOffset = hasMore ? input.offset + rows.length : undefined;

      const objektIds = rows.map((r) => r.objektId).filter((id): id is string => id !== null);
      const objektMap = await fetchObjektMap(objektIds);

      const items = rows.map((row) => {
        const objekt = row.objektId ? objektMap.get(row.objektId) : null;
        const nickname = row.ownerHideNickname || !row.ownerNickname ? null : row.ownerNickname;
        const currency = row.currency ? normalizeCurrency(row.currency) : null;
        const rate = currency ? (rates[currency] ?? 1) : 1;
        const usdPrice = row.price !== null ? row.price * rate : null;

        return {
          id: row.id,
          price: row.price,
          isQyop: row.isQyop,
          note: row.note,
          createdAt: row.createdAt,
          currency,
          usdPrice,
          list: {
            slug: row.slug,
            profileSlug: row.profileSlug,
            profile: row.profileAddress ? { nickname, address: row.profileAddress } : null,
          },
          serial: row.hideSerial ? null : (objekt?.serial ?? null),
          transferable: row.hideSerial ? null : (objekt?.transferable ?? null),
        } satisfies MarketListing;
      });

      return {
        items,
        hasMore,
        nextOffset,
      } satisfies MarketListingsOutput;
    }),

  rates: pub
    .route({
      method: "GET",
      path: "/market/rates",
      tags: ["Market"],
      summary: "USD value of one unit of each currency",
    })
    .output(documented(currencyRatesOutputSchema))
    .handler(getUsdRates),

  stats: pub
    .route({
      method: "GET",
      path: "/market/{collectionSlug}/stats",
      tags: ["Market"],
      summary: "One collection's listing count, floor price and sellers",
    })
    .input(collectionSlugInputSchema)
    .output(documented(marketStatsOutputSchema))
    .handler(async ({ input }) => {
      const rates = await getUsdRates();

      const [row] = await db
        .select({
          total: sql<number>`count(*)::int`,
          floorPrice: sql<
            number | null
          >`min(CASE WHEN ${listEntries.isQyop} OR ${listEntries.price} IS NULL THEN NULL ELSE ${usdPriceExpr(rates)} END)`,
          sellers: sql<number>`count(DISTINCT ${lists.profileAddress})::int`,
        })
        .from(listEntries)
        .innerJoin(lists, eq(listEntries.listId, lists.id))
        .where(listingsWhere(input.collectionSlug));

      // aggregate without GROUP BY always yields exactly one row
      return row! satisfies MarketStatsOutput;
    }),
};
