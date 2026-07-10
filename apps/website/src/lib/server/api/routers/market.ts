import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, userAddress } from "@repo/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";

import {
  sortBySchema,
  sortDirSchema,
  type MarketListing,
  type MarketResult,
} from "@/lib/universal/market";

import { getUsdRates } from "../../currency-rates";
import { pub } from "../orpc";

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
  const whens = Object.entries(rates)
    .filter(([code]) => code !== "USD")
    .map(
      ([code, rate]) => sql`WHEN ${lists.currency} = ${code} THEN ${listEntries.price} * ${rate}`,
    );

  if (whens.length === 0) {
    console.warn("[market] No currency rates available — prices sorted as-is");
    return listEntries.price;
  }

  return sql`CASE ${sql.join(whens, sql` `)} ELSE ${listEntries.price} END`;
}

export const marketRouter = {
  marketListings: pub
    .input(
      z.object({
        collectionSlug: z.string(),
        sortBy: sortBySchema.default("createdAt"),
        sortDir: sortDirSchema.default("desc"),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .handler(async ({ input }) => {
      const rates = await getUsdRates();

      const where = and(
        eq(listEntries.collectionSlug, input.collectionSlug),
        eq(lists.listTypeNew, "sale"),
        eq(lists.discoverable, true),
      );

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
        const rate = row.currency ? (rates[row.currency] ?? 1) : 1;
        const usdPrice = row.price !== null ? row.price * rate : null;

        return {
          id: row.id,
          price: row.price,
          isQyop: row.isQyop,
          note: row.note,
          createdAt: row.createdAt,
          currency: row.currency,
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
      } satisfies MarketResult;
    }),
};
