import { type Tx } from "@repo/db";
import { lists, tradePost } from "@repo/db/schema";
import { touchListWith } from "@repo/lib/server/list-touch";
import { type SQL, and, eq, inArray, sql } from "drizzle-orm";

import { BUMP_COOLDOWN_HOURS } from "../../lib/trade-feed";
import { type PostId, type PostRow, planPostRows } from "../../lib/trade-post-rows";
import type { PlanList } from "../../schemas/trade-post";
import { versionCounter } from "../moderation/safety-cache";

const bumpCutoff = sql`now() - make_interval(hours => ${BUMP_COOLDOWN_HOURS})`;

/**
 * A person's last bump: the latest bump of any of their lists, on Trade or not, so turning a list
 * off and on, or posting a new one, cannot stand in for Bump.
 */
function personBumpedAt(userId: SQL | string) {
  return sql`(SELECT max(p.bumped_at) FROM lists p WHERE p.user_id = ${userId})`;
}

/**
 * The bump time of a list turning Show on Trade on, or created with it on: a bump of its own,
 * unless its owner bumped in the last 24 hours, in which case it takes that bump's time.
 */
export function turnOnBumpedAt(userId: SQL | string) {
  const last = personBumpedAt(userId);
  return sql`CASE WHEN ${last} > ${bumpCutoff} THEN ${last} ELSE now() END`;
}

/** The columns that put a list on or off Trade: turning it on from off counts as a bump. */
export function tradeColumns(on: boolean) {
  if (!on) return { discoverable: false };
  return {
    discoverable: true,
    // raw name: inside the subquery a rendered column could bind to `p`
    bumpedAt: sql<string | null>`CASE
      WHEN lists.discoverable THEN lists.bumped_at
      ELSE ${turnOnBumpedAt(sql`lists.user_id`)}
    END`,
  };
}

/** Every list or entry write calls this once committed, so idle ranking and the cached trade matches stay right. */
export function touchList(listIds: number[]) {
  return touchListWith(versionCounter, listIds);
}

/**
 * The poster's have, want and sale lists, locked until the transaction ends, so two saves can't
 * put one list in two posts. Every writer of a link, of `discoverable` or of a `trade_post` row
 * takes it first: list create and copy, `list.delete`, `anonymizeUser`, and `trade.savePost` /
 * `takeDownPost`.
 */
export async function lockTradeLists(tx: Tx, userId: string): Promise<PlanList[]> {
  return tx
    .select({
      id: lists.id,
      slug: lists.slug,
      name: lists.name,
      listType: lists.listType,
      linkedListId: lists.linkedListId,
      discoverable: lists.discoverable,
      isProfileBind: lists.isProfileBind,
      matchSale: lists.matchSale,
      matchHave: lists.matchHave,
      takesSwaps: lists.takesSwaps,
    })
    .from(lists)
    .where(and(eq(lists.userId, userId), inArray(lists.listType, ["have", "want", "sale"])))
    .orderBy(lists.id)
    .for("update");
}

/**
 * Brings the person's `trade_post` rows in step with their lists as the transaction has left them
 * (`planPostRows`). Call it after the list writes, under `lockTradeLists`. A new writer of a link,
 * of `discoverable`, or one that deletes a have, sale or want list must call it too. Deleting every
 * list needs no call: the rows go with their lead lists.
 */
export async function syncPostRows(tx: Tx, userId: string) {
  const found = await tx
    .select({
      id: lists.id,
      listType: lists.listType,
      discoverable: lists.discoverable,
      linkedListId: lists.linkedListId,
      rowId: tradePost.id,
      wantListId: tradePost.wantListId,
    })
    .from(lists)
    .leftJoin(tradePost, eq(tradePost.leadListId, lists.id))
    .where(and(eq(lists.userId, userId), inArray(lists.listType, ["have", "want", "sale"])))
    .orderBy(lists.id);

  const rows: PostRow[] = found.flatMap((row) =>
    row.rowId === null
      ? []
      : [{ id: row.rowId as PostId, leadListId: row.id, wantListId: row.wantListId }],
  );
  // one entry per list: a list leading two rows comes back twice
  const own = [...new Map(found.map((row) => [row.id, row])).values()].flatMap((row) =>
    row.listType === "general" ? [] : [{ ...row, listType: row.listType }],
  );
  const ops = planPostRows(rows, own);

  if (ops.deletes.length > 0) await tx.delete(tradePost).where(inArray(tradePost.id, ops.deletes));
  for (const { id, wantListId } of ops.updates) {
    await tx.update(tradePost).set({ wantListId }).where(eq(tradePost.id, id));
  }
  if (ops.inserts.length > 0) {
    await tx
      .insert(tradePost)
      .values(
        ops.inserts.map(({ leadListId, wantListId }) => ({ userId, leadListId, wantListId })),
      );
  }
}
