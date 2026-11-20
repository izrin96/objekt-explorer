import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { eq, inArray } from "drizzle-orm";

import { refuse } from "../../lib/refuse";
import type { TradePostRefusal } from "../../schemas/trade";
import {
  membersOf,
  planPost,
  type PostChoice,
  postHolding,
  postsOf,
} from "../../schemas/trade-post";
import { lockPosts, touchList, tradeColumns, tradeState, writePosts } from "../list/shared";

const REFUSAL_MESSAGE: Record<TradePostRefusal, string> = {
  trade_post_list_in_post: "That list is already in another post on Trade",
  trade_post_list_paired: "That list is paired with another list; unpair them to use it here",
  trade_post_needs_profile: "Have and sale lists need a Cosmo profile to go on Trade",
  trade_post_wrong_type: "That list can't be used for this kind of post",
  trade_post_empty: "Pick a list for this post",
};

/** Saves a post's lists, pairing, Open to and Trade state in one transaction. */
export async function savePost(userId: string, choice: PostChoice) {
  const changed = await db.transaction(async (tx) => {
    const locked = await lockPosts(tx, userId);
    const plan = planPost(locked.lists, choice);
    if (!plan.ok) {
      if (plan.reason === "not_found") throw new ORPCError("NOT_FOUND");
      refuse("BAD_REQUEST", plan.reason, REFUSAL_MESSAGE[plan.reason], {
        slug: plan.slug ?? null,
        partner: plan.partner ?? null,
      });
    }

    const touched = new Set<number>();
    const written = [];

    for (const { id, flags } of plan.on) {
      const rows = await tx
        .update(lists)
        .set({ ...tradeColumns(true), ...flags })
        .where(eq(lists.id, id))
        .returning(tradeState);
      written.push(...rows);
      touched.add(id);
    }

    if (plan.saleSwaps) {
      const rows = await tx
        .update(lists)
        .set({ takesSwaps: plan.saleSwaps.takesSwaps })
        .where(eq(lists.id, plan.saleSwaps.id))
        .returning(tradeState);
      written.push(...rows);
      touched.add(plan.saleSwaps.id);
    }

    if (plan.off.length > 0) {
      const rows = await tx
        .update(lists)
        .set(tradeColumns(false))
        .where(inArray(lists.id, plan.off))
        .returning(tradeState);
      written.push(...rows);
      for (const id of plan.off) touched.add(id);
    }

    const relinked = await writePosts(tx, userId, locked, {
      pair: plan.link,
      unpair: plan.unlink,
      written,
    });
    for (const id of relinked) touched.add(id);
    return [...touched];
  });
  await touchList(changed);
}

/** Takes every list of the post off Trade; a pair stays paired, so posting it again brings it back. */
export async function takeDownPost(userId: string, slug: string) {
  const changed = await db.transaction(async (tx) => {
    const locked = await lockPosts(tx, userId);
    const list = locked.lists.find((entry) => entry.slug === slug);
    const post = list ? postHolding(postsOf(locked.lists), list.id) : null;
    if (!post) throw new ORPCError("NOT_FOUND");
    const ids = membersOf(post).map((member) => member.id);
    const written = await tx
      .update(lists)
      .set(tradeColumns(false))
      .where(inArray(lists.id, ids))
      .returning(tradeState);
    const relinked = await writePosts(tx, userId, locked, { written });
    return [...new Set([...ids, ...relinked])];
  });
  await touchList(changed);
}
