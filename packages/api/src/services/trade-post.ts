import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { and, eq, inArray, notInArray, or } from "drizzle-orm";

import { refuse } from "../lib/refuse";
import type { TradePostRefusal } from "../schemas/trade";
import {
  membersOf,
  type PlanList,
  planPost,
  type PostChoice,
  postHolding,
  postsOf,
} from "../schemas/trade-post";
import { touchList, tradeColumns } from "./list";
import type { Tx } from "./moderation";

const REFUSAL_MESSAGE: Record<TradePostRefusal, string> = {
  trade_post_list_in_post: "That list is already in another post on Trade",
  trade_post_list_paired: "That list is paired with another list; unpair them to use it here",
  trade_post_needs_profile: "Have and sale lists need a Cosmo profile to go on Trade",
  trade_post_wrong_type: "That list can't be used for this kind of post",
  trade_post_empty: "Pick a list for this post",
};

/**
 * The poster's have, want and sale lists, locked until the transaction ends, so two saves can't
 * put one list in two posts.
 */
async function lockPosterLists(tx: Tx, userId: string): Promise<PlanList[]> {
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
    })
    .from(lists)
    .where(and(eq(lists.userId, userId), inArray(lists.listType, ["have", "want", "sale"])))
    .orderBy(lists.id)
    .for("update");
}

/** Saves a post's lists, link, Open to and Trade state in one transaction. */
export async function savePost(userId: string, choice: PostChoice) {
  const changed = await db.transaction(async (tx) => {
    const own = await lockPosterLists(tx, userId);
    const plan = planPost(own, choice);
    if (!plan.ok) {
      if (plan.reason === "not_found") throw new ORPCError("NOT_FOUND");
      refuse("BAD_REQUEST", plan.reason, REFUSAL_MESSAGE[plan.reason], {
        slug: plan.slug ?? null,
        partner: plan.partner ?? null,
      });
    }

    const touched = new Set<number>();
    const mine = eq(lists.userId, userId);

    if (plan.unlink.length > 0) {
      const rows = await tx
        .update(lists)
        .set({ linkedListId: null })
        .where(
          and(mine, or(inArray(lists.id, plan.unlink), inArray(lists.linkedListId, plan.unlink))),
        )
        .returning({ id: lists.id });
      for (const row of rows) touched.add(row.id);
    }

    if (plan.link) {
      const [haveId, wantId] = plan.link;
      // any other list still pointing at either half loses its link, as `list.edit` does
      const stale = await tx
        .update(lists)
        .set({ linkedListId: null })
        .where(and(mine, inArray(lists.linkedListId, plan.link), notInArray(lists.id, plan.link)))
        .returning({ id: lists.id });
      for (const row of stale) touched.add(row.id);
      await tx.update(lists).set({ linkedListId: wantId }).where(eq(lists.id, haveId));
      await tx.update(lists).set({ linkedListId: haveId }).where(eq(lists.id, wantId));
      touched.add(haveId).add(wantId);
    }

    for (const { id, flags } of plan.on) {
      await tx
        .update(lists)
        .set({ ...tradeColumns(true), ...flags })
        .where(eq(lists.id, id));
      touched.add(id);
    }

    if (plan.off.length > 0) {
      await tx.update(lists).set(tradeColumns(false)).where(inArray(lists.id, plan.off));
      for (const id of plan.off) touched.add(id);
    }

    return [...touched];
  });
  await touchList(changed);
}

/** Takes every list of the post off Trade; a Swap pair stays linked, so posting it again brings it back. */
export async function takeDownPost(userId: string, slug: string) {
  const changed = await db.transaction(async (tx) => {
    const own = await lockPosterLists(tx, userId);
    const list = own.find((entry) => entry.slug === slug);
    const post = list ? postHolding(postsOf(own), list.id) : null;
    if (!post) throw new ORPCError("NOT_FOUND");
    const ids = membersOf(post).map((member) => member.id);
    await tx.update(lists).set(tradeColumns(false)).where(inArray(lists.id, ids));
    return ids;
  });
  await touchList(changed);
}
