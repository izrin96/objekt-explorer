import { db } from "@repo/db";
import { userBlock } from "@repo/db/schema";
import { and, desc, eq } from "drizzle-orm";

import { iso } from "../lib/time";
import { afterBlockChange, fetchPartners } from "./chat";
import { lockUsersForWrite } from "./cosmo-link";
import { findAccount, refuseModeration } from "./moderation";
import { cancelOpenOffers, offersBetween, publishCancelled } from "./offer/cancel";
import { userRateLimited } from "./redis";

const UNBLOCKS_PER_DAY = 50;
const DAY_SECONDS = 86_400;

export async function blockUser(me: string, userId: string) {
  if (userId === me) refuseModeration("self");
  await findAccount(userId);
  const cancelled = await db.transaction(async (tx) => {
    // both rows `FOR NO KEY UPDATE`, in id order, so an offer or accept that read the pair's
    // safety under `lockParties` has finished, or starts after this block is visible
    await lockUsersForWrite(tx, [me, userId]);
    await tx.insert(userBlock).values({ blockerId: me, blockedId: userId }).onConflictDoNothing();
    return cancelOpenOffers(tx, offersBetween(me, userId), "blocked");
  });
  await afterBlockChange(me, userId);
  await publishCancelled(cancelled);
}

/** Blocking is never limited, being the safe direction; only an unblock that removes a block counts. */
export async function unblockUser(me: string, userId: string) {
  const held = await db.$count(
    userBlock,
    and(eq(userBlock.blockerId, me), eq(userBlock.blockedId, userId)),
  );
  if (held === 0) return;
  if (await userRateLimited("unblock", me, UNBLOCKS_PER_DAY, DAY_SECONDS)) {
    refuseModeration("daily_limit");
  }
  await db
    .delete(userBlock)
    .where(and(eq(userBlock.blockerId, me), eq(userBlock.blockedId, userId)));
  await afterBlockChange(me, userId);
}

export async function blockedAccounts(me: string) {
  const rows = await db
    .select({ userId: userBlock.blockedId, blockedAt: userBlock.createdAt })
    .from(userBlock)
    .where(eq(userBlock.blockerId, me))
    .orderBy(desc(userBlock.createdAt));
  const partners = await fetchPartners(rows.map((row) => row.userId));
  return rows.flatMap((row) => {
    const partner = partners.get(row.userId);
    return partner ? [{ ...partner, blockedAt: iso(row.blockedAt)! }] : [];
  });
}
