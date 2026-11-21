import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import { and, eq, isNotNull } from "drizzle-orm";

import {
  addressesByUser,
  collectionVerdict,
  copyPairsOf,
  groupBySlug,
} from "../../../lib/trade-rank";
import { listTradeStateSql } from "../../../lib/trade-sql";
import { narrowIndex, type RuleWant, ruleOnlyWant, type Viewer } from "../../../lib/trade-viewer";
import { unique } from "../../../lib/unique";
import { getCache, redis, redisFailOpen } from "../../redis";
import { boundOfferList, matchableList } from "../lists";
import { fetchAddresses, fetchHoldings } from "../matches/holdings";

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
      .where(and(eq(lists.userId, userId), boundOfferList, isNotNull(listEntries.collectionSlug))),
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
    copyPairsOf(owned.map((entry) => ({ slug: entry.slug, objektId: entry.objektId, addresses }))),
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
    .where(and(eq(lists.userId, userId), matchableList))
    .limit(1);
  return row !== undefined;
}

export async function fetchViewer(userId: string): Promise<Viewer> {
  const version =
    (await redisFailOpen("trade version", () => redis.get(tradeVersionKey(userId)))) ?? "0";
  // each list's Open to and takes_swaps by its posts: those on Trade, else all, else the default
  const [haveIndex, saleLists, wantLists, wantRows] = await Promise.all([
    getCache(`trade:have-lists:${userId}:${version}`, HAVE_TTL_SECONDS, () =>
      computeHaveIndex(userId),
    ),
    db
      .select({ id: lists.id, takesSwaps: listTradeStateSql("lists", "takesSwaps") })
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.listType, "sale"))),
    db
      .select({
        id: lists.id,
        matchSale: listTradeStateSql("lists", "matchSale"),
        matchHave: listTradeStateSql("lists", "matchHave"),
      })
      .from(lists)
      .where(and(eq(lists.userId, userId), eq(lists.listType, "want"))),
    db
      .selectDistinct({
        listId: listEntries.listId,
        slug: listEntries.collectionSlug,
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
  const handWant = new Map<string, number[]>();
  const ruleRows = new Map<string, RuleWant[]>();
  for (const row of wantRows) {
    if (row.ruleId === null) {
      const listIds = handWant.get(row.slug!) ?? [];
      if (!listIds.includes(row.listId)) listIds.push(row.listId);
      handWant.set(row.slug!, listIds);
      continue;
    }
    const rules = ruleRows.get(row.slug!) ?? [];
    rules.push({ ruleId: row.ruleId, listId: row.listId });
    ruleRows.set(row.slug!, rules);
  }
  const have = new Map(haveIndex);
  const saleIds = new Set(saleLists.map((list) => list.id));
  // a sale list that takes swaps answers want lists open to swaps too
  const swapSaleIds = new Set(saleLists.flatMap((list) => (list.takesSwaps ? [list.id] : [])));
  const noSaleIds = new Set(wantLists.flatMap((list) => (list.matchSale ? [] : [list.id])));
  const noHaveIds = new Set(wantLists.flatMap((list) => (list.matchHave ? [] : [list.id])));
  return {
    have,
    want,
    tradeHave: narrowIndex(have, (id) => !saleIds.has(id) || swapSaleIds.has(id)),
    saleHave: narrowIndex(have, (id) => saleIds.has(id)),
    tradeWant: narrowIndex(want, (id) => !noHaveIds.has(id)),
    saleWant: narrowIndex(want, (id) => !noSaleIds.has(id)),
    // a slug wanted by hand on any of the lists is no rule's match
    ruleWant: ruleOnlyWant(ruleRows, handWant),
    ruleRows,
    handWant,
  };
}
