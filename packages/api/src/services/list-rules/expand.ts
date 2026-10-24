// Env-free: the worker's refresh-list-rules job imports this module.
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { listEntries, listRule, userAddress } from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import {
  expandRule,
  type ListRuleDef,
  type RuleCollection,
  type RuleExpansion,
} from "../../schemas/list-rule";

type CollectionRow = {
  slug: string;
  artist: RuleCollection["artist"];
  season: string;
  collection_no: string;
  class: string;
  member: string;
  on_offline: RuleCollection["onOffline"];
};

/** Rules with one key describe the same collections, so one read serves them all. */
export const collectionsKey = (rule: ListRuleDef) =>
  [rule.kind, rule.artist, rule.season ?? "*", rule.collectionNo ?? rule.class ?? ""].join("|");

/** The online collections a rule can describe; `expandRule` applies the rest. */
export async function ruleCollections(rule: ListRuleDef): Promise<RuleCollection[]> {
  const result = await indexer.execute<CollectionRow>(sql`
    SELECT slug, artist, season, collection_no, class, member, on_offline
    FROM collection
    WHERE artist = ${rule.artist}
      AND on_offline = 'online'
      ${rule.season === null ? sql`` : sql`AND season = ${rule.season}`}
      ${
        rule.kind === "collection"
          ? sql`AND collection_no = ${rule.collectionNo ?? ""}`
          : sql`AND class = ${rule.class ?? ""}`
      }
    ORDER BY collection_no, member
  `);
  return result.rows.map((row) => ({
    slug: row.slug,
    artist: row.artist,
    season: row.season,
    collectionNo: row.collection_no,
    class: row.class,
    member: row.member,
    onOffline: row.on_offline,
  }));
}

export async function linkedAddresses(userId: string) {
  const rows = await db
    .select({ address: userAddress.address })
    .from(userAddress)
    .where(eq(userAddress.userId, userId));
  return rows.map((row) => row.address.toLowerCase());
}

/** Which of `slugs` the addresses hold any copy of. Restricted to `slugs`, so no wallet is read whole. */
export async function heldSlugs(addresses: string[], slugs: string[]): Promise<Set<string>> {
  if (addresses.length === 0 || slugs.length === 0) return new Set();
  const result = await indexer.execute<{ slug: string }>(sql`
    SELECT DISTINCT c.slug
    FROM collection c
    JOIN objekt o ON o.collection_id = c.id
    WHERE c.slug = ANY(${sql.param(slugs)}::text[])
      AND o.owner = ANY(${sql.param(addresses)}::text[])
  `);
  return new Set(result.rows.map((row) => row.slug));
}

export type RuleReading = RuleExpansion & {
  collections: RuleCollection[];
  held: Set<string>;
};

/** A rule's expansion for its owner, from the indexer as it is now. */
export async function readRule(
  rule: ListRuleDef,
  addresses: string[],
  collections?: RuleCollection[],
): Promise<RuleReading> {
  const described = collections ?? (await ruleCollections(rule));
  const held = await heldSlugs(
    addresses,
    described.map((c) => c.slug),
  );
  return { ...expandRule(rule, described, held), collections: described, held };
}

/**
 * Makes a rule's entries match `slugs`: inserts the missing, deletes the extra, and
 * keeps every other row and its id, so the alert cursor never reads them as new.
 * Returns whether anything changed; false too when the rule is gone.
 */
export async function syncRuleEntries(ruleId: number, slugs: readonly string[]) {
  return db.transaction((tx) => syncRuleEntriesTx(tx, ruleId, slugs));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** `syncRuleEntries` inside the caller's transaction, so a rule and its entries land together. */
export async function syncRuleEntriesTx(tx: Tx, ruleId: number, slugs: readonly string[]) {
  // one writer per rule: a save and the worker's refresh never both insert a slug
  const [rule] = await tx
    .select({ listId: listRule.listId })
    .from(listRule)
    .where(eq(listRule.id, ruleId))
    .for("update");
  if (!rule) return false;

  const current = await tx
    .select({ id: listEntries.id, slug: listEntries.collectionSlug })
    .from(listEntries)
    .where(eq(listEntries.ruleId, ruleId));

  const wanted = new Set(slugs);
  const have = new Set(current.map((row) => row.slug));
  const stale = current.filter((row) => row.slug === null || !wanted.has(row.slug));
  const missing = [...wanted].filter((slug) => !have.has(slug));

  if (stale.length > 0) {
    await tx.delete(listEntries).where(
      and(
        eq(listEntries.ruleId, ruleId),
        inArray(
          listEntries.id,
          stale.map((row) => row.id),
        ),
      ),
    );
  }
  if (missing.length > 0) {
    await tx
      .insert(listEntries)
      .values(missing.map((slug) => ({ listId: rule.listId, collectionSlug: slug, ruleId })));
  }
  return stale.length > 0 || missing.length > 0;
}
