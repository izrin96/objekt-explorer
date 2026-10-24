import { RULE_MAX_OBJEKTS, type RuleCollection } from "@repo/api/schemas/list-rule";
import {
  collectionsKey,
  linkedAddresses,
  readRule,
  ruleCollections,
  syncRuleEntries,
} from "@repo/api/services/list-rules/expand";
import { db } from "@repo/db";
import { listRule, lists } from "@repo/db/schema";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { asc, eq, gt } from "drizzle-orm";

import { heartbeat, log } from "../lib/log";
import { redis } from "../lib/redis";

const PAGE_SIZE = 200;

const refreshLog = log("refresh-list-rules");
const refreshBeat = heartbeat(refreshLog);

/**
 * Re-expands every want-list rule against new collections and the owners' holdings.
 * `syncRuleEntries` diffs, so an unchanged rule writes nothing and keeps its entry ids. A change
 * drops the owner's cached trade matches but leaves `lists.updated_at`, which means an edit.
 */
export async function refreshListRules() {
  refreshBeat.count("runs");
  const collections = new Map<string, Promise<RuleCollection[]>>();
  const addresses = new Map<string, Promise<string[]>>();
  const changedLists = new Set<number>();
  const changedOwners = new Set<string>();
  let rules = 0;
  let changed = 0;
  let tooWide = 0;
  let after = 0;

  try {
    for (;;) {
      const page = await db
        .select({
          id: listRule.id,
          listId: listRule.listId,
          userId: lists.userId,
          kind: listRule.kind,
          artist: listRule.artist,
          season: listRule.season,
          collectionNo: listRule.collectionNo,
          class: listRule.class,
          editions: listRule.editions,
          members: listRule.members,
          prio: listRule.prio,
          skipOwned: listRule.skipOwned,
        })
        .from(listRule)
        .innerJoin(lists, eq(lists.id, listRule.listId))
        .where(gt(listRule.id, after))
        .orderBy(asc(listRule.id))
        .limit(PAGE_SIZE);
      if (page.length === 0) break;
      after = page.at(-1)!.id;

      for (const { id, listId, userId, ...def } of page) {
        const key = collectionsKey(def);
        if (!collections.has(key)) collections.set(key, ruleCollections(def));
        if (!addresses.has(userId)) addresses.set(userId, linkedAddresses(userId));

        const reading = await readRule(
          def,
          await addresses.get(userId)!,
          await collections.get(key)!,
        );
        rules += 1;
        // the save refused a rule this wide; one grown past it by new collections keeps its entries
        if (reading.covers > RULE_MAX_OBJEKTS) {
          tooWide += 1;
          continue;
        }
        if (await syncRuleEntries(id, reading.slugs)) {
          changed += 1;
          changedLists.add(listId);
          changedOwners.add(userId);
          refreshLog.debug(`rule ${id}: ${reading.canMatch} can match`);
        }
      }
      if (page.length < PAGE_SIZE) break;
    }

    // only the owners' cached matches: `updated_at` is the owner's own edit, and a refresh is not
    // one, so it must not keep an idle post listed or show it as updated
    await bumpTradeVersion(redis, changedOwners);
    refreshBeat.count("rules", rules);
    if (tooWide > 0) {
      refreshLog.warn(
        `${tooWide} rules now cover more than ${RULE_MAX_OBJEKTS} objekts; left as they were`,
      );
    }
    if (changed > 0) {
      refreshLog.info(`${changed} of ${rules} rules changed entries on ${changedLists.size} lists`);
    }
  } finally {
    refreshBeat.flush();
  }
}
