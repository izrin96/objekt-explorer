import { db } from "@repo/db";
import {
  lists,
  messagePref,
  notification,
  notificationPref,
  user,
  userAddress,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";

import { hasTradeInProgress, refusalError } from "./account-delete";
import { cancelOpenOffers, offersOf, publishCancelled } from "./offer/cancel";

const DELETED_ACCOUNT_NAME = "Deleted account";

/**
 * Account deletion, in place of removing the row: trades, ratings, reports and sanctions keep
 * pointing at it, so the other party's history and reputation stay whole. What identifies the
 * person or shows their content goes, except their messages, which stay in the other party's
 * conversation.
 */
export async function anonymizeUser(userId: string) {
  const cancelled = await db.transaction(async (tx) => {
    // first, so the notes it writes to this account go with the rest below, and so an accept
    // racing it either commits its trade before the check below or finds its offer gone
    const result = await cancelOpenOffers(tx, offersOf(userId), "account_deleted");
    if (await hasTradeInProgress(tx, userId)) throw refusalError("trade_in_progress");
    await tx
      .update(user)
      .set({
        name: DELETED_ACCOUNT_NAME,
        // unique and unreachable, and frees the address for a new sign-up
        email: `${userId}@deleted.invalid`,
        emailVerified: false,
        image: null,
        username: null,
        displayUsername: null,
        discord: null,
        twitter: null,
        showSocial: false,
        deletedAt: new Date(),
      })
      .where(eq(user.id, userId));
    await tx.update(userAddress).set({ userId: null }).where(eq(userAddress.userId, userId));
    await tx.delete(lists).where(eq(lists.userId, userId));
    await tx.delete(notification).where(eq(notification.userId, userId));
    await tx.delete(notificationPref).where(eq(notificationPref.userId, userId));
    await tx.delete(messagePref).where(eq(messagePref.userId, userId));
    return result;
  });
  await publishCancelled(cancelled);
}
