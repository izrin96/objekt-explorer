import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import { and, eq, isNotNull } from "drizzle-orm";

import type { Viewer } from "../../lib/trade-feed";
import { addressesByUser, collectionVerdict, groupBySlug } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { getCache, redis } from "../redis";
import { offersOnTrade, takesPartInTrade } from "../trade-lists";
import { fetchAddresses, fetchHoldings } from "../trade-matches/holdings";

const HAVE_TTL_SECONDS = 300;

/**
 * Collections on the user's bound have lists that they can still trade, with the lists that
 * can trade each; never the whole wallet.
 */
async function computeHaveIndex(userId: string): Promise<[string, number[]][]> {
  const [entries, addressRows] = await Promise.all([
    db
      .select({
        listId: listEntries.listId,
        slug: listEntries.collectionSlug,
        objektId: listEntries.objektId,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(and(eq(lists.userId, userId), offersOnTrade, isNotNull(listEntries.collectionSlug))),
    fetchAddresses([userId]),
  ]);
  if (entries.length === 0) return [];

  const addresses = addressesByUser(addressRows).get(userId) ?? new Set<string>();
  const owned = entries.map((entry) => ({
    listId: entry.listId,
    slug: entry.slug!,
    objektId: entry.objektId,
  }));
  const holdings = await fetchHoldings(
    unique(owned.flatMap((entry) => (entry.objektId ? [entry.objektId] : []))),
    unique(owned.flatMap((entry) => (entry.objektId ? [] : [entry.slug]))),
    [...addresses],
  );

  return [...groupBySlug(owned)].flatMap(([slug, group]) => {
    const { verdict, listIds } = collectionVerdict(group, addresses, holdings);
    return verdict === "ok" ? [[slug, listIds] as [string, number[]]] : [];
  });
}

export async function hasTradeList(userId: string) {
  const [row] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.userId, userId), takesPartInTrade))
    .limit(1);
  return row !== undefined;
}

export async function fetchViewer(userId: string): Promise<Viewer> {
  const version = (await redis.get(tradeVersionKey(userId))) ?? "0";
  const [have, wantRows] = await Promise.all([
    getCache(`trade:have-lists:${userId}:${version}`, HAVE_TTL_SECONDS, () =>
      computeHaveIndex(userId),
    ),
    db
      .selectDistinct({ listId: listEntries.listId, slug: listEntries.collectionSlug })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(
        and(
          eq(lists.userId, userId),
          eq(lists.listTypeNew, "want"),
          isNotNull(listEntries.collectionSlug),
        ),
      ),
  ]);
  const want = new Map<string, number[]>();
  for (const row of wantRows) {
    const listIds = want.get(row.slug!);
    if (listIds) listIds.push(row.listId);
    else want.set(row.slug!, [row.listId]);
  }
  return { have: new Map(have), want };
}
