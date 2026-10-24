import { db } from "@repo/db";
import {
  lists,
  messagePref,
  notification,
  notificationPref,
  report,
  user,
  userAddress,
} from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import { deletionBlockers, refusalOf } from "../lib/account-deletion";
import { ownBannerKey } from "../lib/banner-key";
import { disconnectUser } from "../realtime";
import { deletionState, refusalError } from "./account-delete";
import { lockAddresses, recordLinkEvents } from "./cosmo-link";
import { audit, openReportsOf } from "./moderation";
import { cancelOpenOffers, offersOf, publishCancelled } from "./offer/cancel";
import { deleteFileFromBucket, S3_BUCKET, S3_PUBLIC_URL } from "./s3";

const DELETED_ACCOUNT_NAME = "Deleted account";

/**
 * Account deletion, in place of removing the row: trades, ratings, reports and sanctions keep
 * pointing at it, so the other party's history and reputation stay whole. What identifies the
 * person or shows their content goes, except their messages, which stay in the other party's
 * conversation.
 *
 * `self` is a user deleting their own account. Admin removal usually follows a ban, so only
 * `self` is refused on a sanction and writes the `account_deleted` audit entry.
 */
export async function anonymizeUser(userId: string, { self }: { self: boolean }) {
  const { cancelled, banners } = await db.transaction(async (tx) => {
    // the user row before any offer row, as accept takes it; an accept racing this either
    // commits its trade before the check below or then finds its offer gone
    await tx.execute(sql`SELECT 1 FROM "user" WHERE id = ${userId} FOR NO KEY UPDATE`);
    // before the scrub, so the notes it writes to this account go with the rest below
    const result = await cancelOpenOffers(tx, offersOf(userId), "account_deleted");
    const blockers = deletionBlockers({ ...(await deletionState(tx, userId)), now: new Date() });
    const refusal = refusalOf(self ? blockers : blockers.filter((b) => b.kind === "trade"));
    if (refusal) throw refusalError(refusal);
    if (self) {
      const open = await tx.select({ id: report.id }).from(report).where(openReportsOf(userId));
      await audit(tx, {
        actorId: userId,
        action: "account_deleted",
        targetUserId: userId,
        reportIds: open.map((row) => row.id),
        detail: { openReports: open.length },
      });
    }
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
    const held = await tx
      .select({ address: userAddress.address, bannerImgUrl: userAddress.bannerImgUrl })
      .from(userAddress)
      .where(eq(userAddress.userId, userId));
    await lockAddresses(
      tx,
      held.map((row) => row.address),
    );
    const unlinked = await tx
      .update(userAddress)
      .set({ userId: null, isDefault: false, bannerImgUrl: null, bannerImgType: null })
      .where(eq(userAddress.userId, userId))
      .returning({ address: userAddress.address });
    await recordLinkEvents(
      tx,
      unlinked.map((row) => ({
        address: row.address,
        userId,
        event: "unlinked" as const,
        reason: "account_deleted" as const,
      })),
    );
    await tx.delete(lists).where(eq(lists.userId, userId));
    await tx.delete(notification).where(eq(notification.userId, userId));
    await tx.delete(notificationPref).where(eq(notificationPref.userId, userId));
    await tx.delete(messagePref).where(eq(messagePref.userId, userId));
    return { cancelled: result, banners: held };
  });
  await publishCancelled(cancelled);
  // the scrub committed; an open tab's connection would keep receiving its events
  await disconnectUser(userId);

  // after the commit, so a failed delete cannot undo the scrub; the rows no longer name the files
  for (const { address, bannerImgUrl } of banners) {
    const key = bannerImgUrl && ownBannerKey(bannerImgUrl, S3_PUBLIC_URL, address);
    if (!key) continue;
    try {
      await deleteFileFromBucket(S3_BUCKET, key);
    } catch (error) {
      console.error("Failed to delete banner of deleted account:", key, error);
    }
  }
}
