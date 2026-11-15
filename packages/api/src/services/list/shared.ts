import { type Tx } from "@repo/db";
import { lists, tradePost } from "@repo/db/schema";
import { touchListWith } from "@repo/lib/server/list-touch";
import { type SQL, and, eq, inArray, sql } from "drizzle-orm";

import { BUMP_COOLDOWN_HOURS } from "../../lib/trade-feed";
import {
  partnersOf,
  type PostId,
  type PostRow,
  type PostWrite,
  planPostWrite,
  type TradeListState,
} from "../../lib/trade-post-rows";
import type { ListType } from "../../schemas/list";
import type { PlanList } from "../../schemas/trade-post";
import { versionCounter } from "../moderation/safety-cache";
import { postPartnerSql } from "../trade/lists";

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

/** A list as `lockTradeLists` returns it: what `PlanList` holds but the partner. */
export type LockedList = Omit<PlanList, "linkedListId">;

/**
 * The poster's have, want and sale lists, locked until the transaction ends, so two saves can't
 * put one list in two posts. Every writer of a pairing, of `discoverable` or of a `trade_post`
 * row takes it first, through `lockPosts`: list create and copy, `list.delete`, `trade.savePost`
 * and `takeDownPost`. `anonymizeUser` and `list.edit`'s Buying only save take it alone.
 */
export async function lockTradeLists(tx: Tx, userId: string): Promise<LockedList[]> {
  return tx
    .select({
      id: lists.id,
      slug: lists.slug,
      name: lists.name,
      listType: lists.listType,
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

export type LockedPosts = {
  /** the locked lists, each with its partner by the rows: what `planPost` and the refusals read */
  lists: PlanList[];
  /** the person's have, sale and want lists and their rows, read after the lock: what the plan starts from */
  current: { lists: TradeListState[]; rows: PostRow[] };
};

/**
 * `lockTradeLists`, then a fresh read of the person's lists and rows in a statement of its own.
 * The locked statement may have waited for a writer that created a list, and returns only the
 * lists that were there when it began; this read sees the new one and its row.
 */
export async function lockPosts(tx: Tx, userId: string): Promise<LockedPosts> {
  const locked = await lockTradeLists(tx, userId);
  const found = await tx
    .select({
      id: lists.id,
      listType: lists.listType,
      discoverable: lists.discoverable,
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
  const current = [...new Map(found.map((row) => [row.id, row])).values()].flatMap(tradeStates);
  const partners = partnersOf(rows);
  return {
    lists: locked.map((list) =>
      Object.assign(list, { linkedListId: partners.get(list.id) ?? null }),
    ),
    current: { lists: current, rows },
  };
}

/** RETURNING columns of a list write, for `writePosts`' `written`. */
export const tradeState = {
  id: lists.id,
  listType: lists.listType,
  discoverable: lists.discoverable,
};

type WrittenList = { id: number; listType: ListType; discoverable: boolean };

const tradeStates = ({ id, listType, discoverable }: WrittenList): TradeListState[] =>
  listType === "general" ? [] : [{ id, listType, discoverable }];

/**
 * Plans the write over the rows `lockPosts` read (`planPostWrite`), writes the row operations,
 * and then mirrors `lists.linked_list_id` from the rows, which nothing reads but a build from
 * before the rows led. Call it after the list writes. Returns the lists whose partner changed,
 * for `touchList`. A new writer of a pairing, of `discoverable`, or one that deletes a have,
 * sale or want list goes through it and never writes `linked_list_id`.
 */
export async function writePosts(
  tx: Tx,
  userId: string,
  locked: LockedPosts,
  write: Omit<PostWrite, "written"> & { written?: WrittenList[] },
): Promise<number[]> {
  const { ops, relinked, mirror } = planPostWrite(locked.current, {
    ...write,
    written: write.written?.flatMap(tradeStates),
  });

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
  if (mirror) {
    await tx.execute(sql`
      UPDATE lists SET linked_list_id = mirror.partner_id
      FROM (
        SELECT l.id, ${postPartnerSql("l")} AS partner_id
        FROM lists l
        WHERE l.user_id = ${userId} AND l.list_type IN ('have', 'sale', 'want')
      ) mirror
      WHERE lists.id = mirror.id
        AND lists.linked_list_id IS DISTINCT FROM mirror.partner_id
    `);
  }
  return relinked;
}
