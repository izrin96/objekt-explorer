import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { listEntries, listRule, lists } from "@repo/db/schema";
import type { List } from "@repo/db/schema";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import {
  type ListRuleDef,
  type ListRuleInput,
  RULE_MAX_OBJEKTS,
  RULE_MAX_PER_LIST,
  ruleCovers,
  ruleDef,
  ruleProblem,
  type RuleCollection,
} from "../../schemas/list-rule";
import { fetchCollectionsBySlug, touchList } from "../list";
import type { Tx } from "../moderation";
import {
  collectionsKey,
  linkedAddresses,
  readRule,
  ruleCollections,
  syncRuleEntriesTx,
} from "./expand";

export { linkedAddresses, readRule, syncRuleEntries } from "./expand";

const ruleColumns = {
  id: listRule.id,
  listId: listRule.listId,
  kind: listRule.kind,
  artist: listRule.artist,
  season: listRule.season,
  collectionNo: listRule.collectionNo,
  class: listRule.class,
  editions: listRule.editions,
  members: listRule.members,
  prio: listRule.prio,
  skipOwned: listRule.skipOwned,
};

type RuleRow = ListRuleDef & { id: number; listId: number };

const toDef = (row: RuleRow): ListRuleDef => ({
  kind: row.kind,
  artist: row.artist,
  season: row.season,
  collectionNo: row.collectionNo,
  class: row.class,
  editions: row.editions,
  members: row.members,
  prio: row.prio,
  skipOwned: row.skipOwned,
});

/** The counts the Add rule dialog shows, for the caller's own holdings. */
export async function previewRule(input: ListRuleInput, userId: string) {
  const def = ruleDef(input);
  const reading = await readRule(def, await linkedAddresses(userId));
  return {
    covers: reading.covers,
    owned: reading.owned,
    canMatch: reading.canMatch,
    problem: ruleProblem(def, reading),
  };
}

function assertWantList(list: Pick<List, "listType">) {
  if (list.listType !== "want") {
    refuse("BAD_REQUEST", "list_rule_not_want", "Only want lists hold rules");
  }
}

/** Refuses a rule that can't be saved; returns the slugs it wants. */
async function checkedSlugs(def: ListRuleDef, userId: string) {
  const reading = await readRule(def, await linkedAddresses(userId));
  const problem = ruleProblem(def, reading);
  if (problem === "too_wide") {
    refuse(
      "BAD_REQUEST",
      "list_rule_too_wide",
      `A rule covers up to ${RULE_MAX_OBJEKTS} objekts; this one covers ${reading.covers}`,
      { covers: reading.covers },
    );
  }
  if (problem === "no_collections") {
    refuse("BAD_REQUEST", "list_rule_no_collections", "No collection matches this rule");
  }
  if (problem === "nothing_to_match") {
    refuse("BAD_REQUEST", "list_rule_nothing_to_match", "You own everything this rule describes");
  }
  return reading.slugs;
}

export async function addRule(list: List, input: ListRuleInput, userId: string) {
  assertWantList(list);
  const def = ruleDef(input);
  // the indexer reads stay outside the transaction, so it holds no connection while they run
  const slugs = await checkedSlugs(def, userId);
  const id = await db.transaction(async (tx) => {
    // the list row is the lock two adds queue on, so neither passes the count the other fills
    await tx.select({ id: lists.id }).from(lists).where(eq(lists.id, list.id)).for("no key update");
    const [{ n } = { n: 0 }] = await tx
      .select({ n: count() })
      .from(listRule)
      .where(eq(listRule.listId, list.id));
    if (n >= RULE_MAX_PER_LIST) {
      refuse("BAD_REQUEST", "list_rule_limit", `A list holds up to ${RULE_MAX_PER_LIST} rules`);
    }
    const [row] = await tx
      .insert(listRule)
      .values({ listId: list.id, ...def })
      .returning({ id: listRule.id });
    await syncRuleEntriesTx(tx, row!.id, slugs);
    return row!.id;
  });
  await touchList([list.id]);
  return { id };
}

async function findRule(list: List, ruleId: number) {
  const [row] = await db
    .select(ruleColumns)
    .from(listRule)
    .where(and(eq(listRule.id, ruleId), eq(listRule.listId, list.id)));
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}

export async function updateRule(list: List, ruleId: number, input: ListRuleInput, userId: string) {
  assertWantList(list);
  await findRule(list, ruleId);
  const def = ruleDef(input);
  const slugs = await checkedSlugs(def, userId);
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(listRule)
      .set({ ...def, updatedAt: sql`now()` })
      .where(and(eq(listRule.id, ruleId), eq(listRule.listId, list.id)))
      .returning({ id: listRule.id });
    // deleted from another tab since `findRule`
    if (updated.length === 0) throw new ORPCError("NOT_FOUND");
    await syncRuleEntriesTx(tx, ruleId, slugs);
  });
  await touchList([list.id]);
}

export async function deleteRule(list: List, ruleId: number) {
  const rows = await db
    .delete(listRule)
    .where(and(eq(listRule.id, ruleId), eq(listRule.listId, list.id)))
    .returning({ id: listRule.id });
  if (rows.length > 0) await touchList([list.id]);
}

/**
 * Turn into objekts: the rule's entries become the list's own, frozen as they are now.
 * A slug the list already holds by hand is not added twice.
 */
export async function detachRule(list: List, ruleId: number) {
  const changed = await db.transaction(async (tx) => {
    const [rule] = await tx
      .select({ id: listRule.id })
      .from(listRule)
      .where(and(eq(listRule.id, ruleId), eq(listRule.listId, list.id)))
      .for("update");
    if (!rule) return false;

    await tx.execute(sql`
      DELETE FROM ${listEntries} r
      USING ${listEntries} h
      WHERE r.rule_id = ${ruleId}
        AND h.list_id = ${list.id}
        AND h.rule_id IS NULL
        AND h.collection_slug = r.collection_slug
    `);
    await tx.update(listEntries).set({ ruleId: null }).where(eq(listEntries.ruleId, ruleId));
    await tx.delete(listRule).where(eq(listRule.id, ruleId));
    return true;
  });
  if (changed) await touchList([list.id]);
}

/**
 * A list's rules, oldest first. `canMatch` counts the entries the rule keeps, which is what
 * matching reads; `owned` and `range` come from the indexer now, for the strip's line.
 */
export async function fetchListRules(list: Pick<List, "id" | "userId">) {
  const rows = await db
    .select({
      ...ruleColumns,
      canMatch: sql<number>`(
        SELECT count(*)::int FROM ${listEntries} e WHERE e.rule_id = "list_rule"."id"
      )`,
    })
    .from(listRule)
    .where(eq(listRule.listId, list.id))
    .orderBy(asc(listRule.id));
  if (rows.length === 0) return [];

  const addresses = await linkedAddresses(list.userId);
  // rules describing the same collections share one indexer read, as the worker's refresh does
  const described = new Map<string, Promise<RuleCollection[]>>();
  return Promise.all(
    rows.map(async (row) => {
      const def = toDef(row);
      const key = collectionsKey(def);
      if (!described.has(key)) described.set(key, ruleCollections(def));
      const reading = await readRule(def, addresses, await described.get(key)!);
      const covered = reading.collections.filter((c) => ruleCovers(def, c));
      const numbers = [...new Set(covered.map((c) => c.collectionNo))].toSorted();
      return Object.assign(def, {
        id: row.id,
        canMatch: row.canMatch,
        covers: reading.covers,
        owned: reading.owned,
        range:
          numbers.length > 0
            ? { from: numbers[0]!, to: numbers.at(-1)!, count: numbers.length }
            : null,
      });
    }),
  );
}

/** The rule definitions of several lists, for export and the Discord format. */
export async function fetchRuleDefs(listIds: number[]) {
  if (listIds.length === 0) return new Map<number, ListRuleDef[]>();
  const rows = await db
    .select(ruleColumns)
    .from(listRule)
    .where(inArray(listRule.listId, listIds))
    .orderBy(asc(listRule.id));
  const byList = new Map<number, ListRuleDef[]>();
  for (const row of rows) {
    const defs = byList.get(row.listId) ?? [];
    defs.push(toDef(row));
    byList.set(row.listId, defs);
  }
  return byList;
}

/**
 * See the objekts: every collection the rule describes, grouped by collection number,
 * with whether the owner holds it and whether the rule wants it now.
 */
export async function ruleObjekts(list: List, ruleId: number) {
  const row = await findRule(list, ruleId);
  const def = toDef(row);
  const reading = await readRule(def, await linkedAddresses(list.userId));
  const covered = reading.collections.filter((c) => ruleCovers(def, c));
  const full = await fetchCollectionsBySlug(
    covered.map((c) => c.slug),
    [],
  );
  const bySlug = new Map(full.map((c) => [c.slug, c]));
  const wanted = new Set(reading.slugs);

  type Shown = (typeof full)[number] & { held: boolean; wanted: boolean };
  const groups = new Map<string, { collectionNo: string; canMatch: number; objekts: Shown[] }>();
  for (const c of covered) {
    const collection = bySlug.get(c.slug);
    if (!collection) continue;
    let group = groups.get(c.collectionNo);
    if (!group) {
      group = { collectionNo: c.collectionNo, canMatch: 0, objekts: [] };
      groups.set(c.collectionNo, group);
    }
    const want = wanted.has(c.slug);
    if (want) group.canMatch += 1;
    group.objekts.push(
      Object.assign({}, collection, { held: reading.held.has(c.slug), wanted: want }),
    );
  }
  return {
    covers: reading.covers,
    owned: reading.owned,
    canMatch: reading.canMatch,
    groups: [...groups.values()].toSorted((a, b) => a.collectionNo.localeCompare(b.collectionNo)),
  };
}

/** Copy as new list: a want-list copy keeps the rules and, until the next refresh, their entries. */
export async function copyRulesTx(tx: Tx, sourceListId: number, targetListId: number) {
  const rows = await tx
    .select(ruleColumns)
    .from(listRule)
    .where(eq(listRule.listId, sourceListId))
    .orderBy(asc(listRule.id));
  if (rows.length === 0) return [];
  // one insert per rule (at most 20), so each copy's entries follow their own rule's id
  const inserted: number[] = [];
  for (const row of rows) {
    const [copy] = await tx
      .insert(listRule)
      .values({ listId: targetListId, ...toDef(row) })
      .returning({ id: listRule.id });
    await tx.execute(sql`
      INSERT INTO ${listEntries} (list_id, collection_slug, rule_id)
      SELECT ${targetListId}, collection_slug, ${copy!.id}
      FROM ${listEntries} WHERE rule_id = ${row.id}
    `);
    inserted.push(copy!.id);
  }
  return inserted;
}

/** Rule definitions by id, for the feed's rule tiles. */
export async function fetchRulesById(ruleIds: number[]) {
  if (ruleIds.length === 0) return new Map<number, ListRuleDef>();
  const rows = await db.select(ruleColumns).from(listRule).where(inArray(listRule.id, ruleIds));
  return new Map(rows.map((row) => [row.id, toDef(row)]));
}
