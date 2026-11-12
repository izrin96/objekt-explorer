import { db } from "@repo/db";
import type { Tx } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

/**
 * Takes what these legs, verified just now, delivered off the receiver's want lists that ask for
 * it (`remove_on_receive`), hand-added entries only: a rule's are the rule's. Only the legs this
 * settle verified, so a list switched on later, or an entry added back, is never reached by an
 * older leg. It leaves `updated_at` alone, since a trade is not the owner's edit.
 */
export async function removeReceived(tx: Tx, legIds: number[]) {
  if (legIds.length === 0) return;
  await tx.execute(sql`
    DELETE FROM list_entries e
    USING lists l, trade_leg g
    WHERE g.id = ANY(${sql.param(legIds)}::int[])
      AND g.verified_at IS NOT NULL
      AND l.user_id = g.to_user_id
      AND l.list_type = 'want'
      AND l.remove_on_receive
      AND e.list_id = l.id
      AND e.collection_slug = g.collection_slug
      AND e.rule_id IS NULL
      AND e.created_at < g.verified_at
  `);
}

/**
 * For the verified legs of a trade the user received: their want lists that still hold the
 * collection as a hand-added entry from before the leg verified, and do not remove what a trade
 * delivers. What the trade page offers to take off, by collection.
 */
export async function stillWantedOn(userId: string, tradeId: number) {
  const { rows } = await db.execute<{ collection_slug: string; slug: string; name: string }>(sql`
    SELECT DISTINCT g.collection_slug, l.slug, l.name, l.id
    FROM trade_leg g
    JOIN lists l ON l.user_id = g.to_user_id
    JOIN list_entries e ON e.list_id = l.id AND e.collection_slug = g.collection_slug
    WHERE g.trade_id = ${tradeId}
      AND g.to_user_id = ${userId}
      AND g.verified_at IS NOT NULL
      AND l.list_type = 'want'
      AND NOT l.remove_on_receive
      AND e.rule_id IS NULL
      AND e.created_at < g.verified_at
    ORDER BY l.id
  `);
  const found = new Map<string, { slug: string; name: string }[]>();
  for (const row of rows) {
    const on = found.get(row.collection_slug) ?? [];
    on.push({ slug: row.slug, name: row.name });
    found.set(row.collection_slug, on);
  }
  return found;
}

/**
 * Takes these collections' hand-added entries off one of the owner's want lists, and with `always`
 * turns the list's switch on in the same transaction, so the two never disagree.
 */
export async function dropReceived(listId: number, collectionSlugs: string[], always: boolean) {
  return db.transaction(async (tx) => {
    if (always) await tx.update(lists).set({ removeOnReceive: true }).where(eq(lists.id, listId));
    return tx
      .delete(listEntries)
      .where(
        and(
          eq(listEntries.listId, listId),
          inArray(listEntries.collectionSlug, collectionSlugs),
          isNull(listEntries.ruleId),
        ),
      )
      .returning({ id: listEntries.id });
  });
}
