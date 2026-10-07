import { db } from "@repo/db";
import { userBlock } from "@repo/db/schema";
import { and, desc, eq } from "drizzle-orm";

import { iso } from "../lib/time";
import { afterBlockChange, fetchPartners } from "./chat";
import { findAccount, refuseModeration } from "./moderation";
import { cancelOpenOffers, offersBetween, publishCancelled } from "./offer";

export async function blockUser(me: string, userId: string) {
  if (userId === me) refuseModeration("self");
  await findAccount(userId);
  const cancelled = await db.transaction(async (tx) => {
    await tx.insert(userBlock).values({ blockerId: me, blockedId: userId }).onConflictDoNothing();
    return cancelOpenOffers(tx, offersBetween(me, userId), "blocked");
  });
  await afterBlockChange(me, userId);
  await publishCancelled(cancelled);
}

export async function unblockUser(me: string, userId: string) {
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
