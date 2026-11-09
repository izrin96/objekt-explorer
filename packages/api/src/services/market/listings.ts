import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, messagePref, userAddress } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import type {
  MarketListingsInput,
  MarketStatsOutput,
  ViewerMarketListing,
  ViewerMarketListingsOutput,
} from "../../schemas/market";
import { notBlockedEither } from "../moderation/safety";
import { countedListings, pricedUsd, usdPriceExpr } from "./aggregate";
import { getUsdRates } from "./currency-rates";

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

function listingsWhere(collectionSlug: string) {
  return and(countedListings(), eq(listEntries.collectionSlug, collectionSlug));
}

/**
 * One collection's listings. With a viewer, `messageable` is false for a seller either of
 * them blocked; the public route drops the field.
 */
export async function findListings(input: MarketListingsInput, viewerId: string | null) {
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
        messageAllow: messagePref.allow,
        blocked: viewerId
          ? sql<boolean>`NOT ${notBlockedEither(viewerId, sql`${lists.userId}`)}`
          : sql<boolean>`false`,
      })
      .from(listEntries)
      .innerJoin(lists, eq(listEntries.listId, lists.id))
      .leftJoin(userAddress, eq(lists.profileAddress, userAddress.address))
      .leftJoin(messagePref, eq(messagePref.userId, lists.userId))
      .where(where);

  const dir = input.sortDir === "desc" ? desc : asc;

  const paginatedRows =
    input.sortBy === "price"
      ? await baseQuery()
          .orderBy(
            sql`CASE WHEN ${listEntries.isQyop} THEN 1 WHEN ${listEntries.price} IS NULL THEN 2 ELSE 0 END`,
            dir(usdPriceExpr(rates)),
            dir(listEntries.id),
          )
          .offset(input.offset)
          .limit(input.limit + 1)
      : await baseQuery()
          .orderBy(dir(listEntries.createdAt), dir(listEntries.id))
          .offset(input.offset)
          .limit(input.limit + 1);

  const hasMore = paginatedRows.length > input.limit;
  const rows = hasMore ? paginatedRows.slice(0, input.limit) : paginatedRows;
  const nextOffset = hasMore ? input.offset + rows.length : undefined;

  const objektIds = rows.map((r) => r.objektId).filter((id): id is string => id !== null);
  const objektMap = await fetchObjektMap(objektIds);

  const items = rows.map((row) => {
    const objekt = row.objektId ? objektMap.get(row.objektId) : null;
    const nickname = row.ownerNickname || null;
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
      objektId: row.hideSerial ? null : row.objektId,
      messageable: !row.blocked && isMessageable(toMessagePref({ allow: row.messageAllow })),
      transferable: row.hideSerial ? null : (objekt?.transferable ?? null),
    } satisfies ViewerMarketListing;
  });

  return {
    items,
    hasMore,
    nextOffset,
  } satisfies ViewerMarketListingsOutput;
}

/** One collection's listing count, floor, median and highest price, and sellers. */
export async function fetchMarketStats(collectionSlug: string) {
  const rates = await getUsdRates();

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      floorPrice: sql<number | null>`min(${pricedUsd(rates)})`,
      medianPrice: sql<
        number | null
      >`(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${pricedUsd(rates)}))::float8`,
      maxPrice: sql<number | null>`max(${pricedUsd(rates)})::float8`,
      sellers: sql<number>`count(DISTINCT ${lists.profileAddress})::int`,
    })
    .from(listEntries)
    .innerJoin(lists, eq(listEntries.listId, lists.id))
    .where(listingsWhere(collectionSlug));

  // aggregate without GROUP BY always yields exactly one row
  return row! satisfies MarketStatsOutput;
}
