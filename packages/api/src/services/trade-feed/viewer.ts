import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import { and, eq, isNotNull } from "drizzle-orm";

import { narrowIndex, type RuleWant, type Viewer } from "../../lib/trade-feed";
import { addressesByUser, collectionVerdict, groupBySlug } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { getCache, redis, redisFailOpen } from "../redis";
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
  const version =
    (await redisFailOpen("trade version", () => redis.get(tradeVersionKey(userId)))) ?? "0";
  const [haveIndex, saleLists, wantRows] = await Promise.all([
    getCache(`trade:have-lists:${userId}:${version}`, HAVE_TTL_SECONDS, () =>
      computeHaveIndex(userId),
    ),
    db
      .select({ id: lists.id, takesSwaps: lists.takesSwaps })
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.listType, "sale"))),
    db
      .selectDistinct({
        listId: listEntries.listId,
        slug: listEntries.collectionSlug,
        matchSale: lists.matchSale,
        matchHave: lists.matchHave,
        ruleId: listEntries.ruleId,
      })
      .from(listEntries)
      .innerJoin(lists, eq(lists.id, listEntries.listId))
      .where(
        and(
          eq(lists.userId, userId),
          eq(lists.listType, "want"),
          isNotNull(listEntries.collectionSlug),
        ),
      ),
  ]);
  const want = new Map<string, number[]>();
  for (const row of wantRows) {
    const listIds = want.get(row.slug!);
    // a slug on a list both by hand and through a rule is one row per `rule_id`
    if (!listIds) want.set(row.slug!, [row.listId]);
    else if (!listIds.includes(row.listId)) listIds.push(row.listId);
  }
  // a slug wanted by hand anywhere is no rule's match
  const byHand = new Set(wantRows.flatMap((row) => (row.ruleId === null ? [row.slug!] : [])));
  const ruleWant = new Map<string, RuleWant[]>();
  for (const row of wantRows) {
    if (row.ruleId === null || byHand.has(row.slug!)) continue;
    const rules = ruleWant.get(row.slug!) ?? [];
    rules.push({ ruleId: row.ruleId, listId: row.listId });
    ruleWant.set(row.slug!, rules);
  }
  const have = new Map(haveIndex);
  const saleIds = new Set(saleLists.map((list) => list.id));
  // a sale list that takes swaps answers want lists open to swaps too
  const swapSaleIds = new Set(saleLists.flatMap((list) => (list.takesSwaps ? [list.id] : [])));
  const noSaleIds = new Set(wantRows.flatMap((row) => (row.matchSale ? [] : [row.listId])));
  const noHaveIds = new Set(wantRows.flatMap((row) => (row.matchHave ? [] : [row.listId])));
  return {
    have,
    want,
    tradeHave: narrowIndex(have, (id) => !saleIds.has(id) || swapSaleIds.has(id)),
    saleHave: narrowIndex(have, (id) => saleIds.has(id)),
    tradeWant: narrowIndex(want, (id) => !noHaveIds.has(id)),
    saleWant: narrowIndex(want, (id) => !noSaleIds.has(id)),
    ruleWant,
  };
}
