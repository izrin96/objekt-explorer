import { publishUsers } from "@repo/api/realtime";
import { RENEW_NOTICE_DAYS } from "@repo/api/schemas/cosmo-session";
import { db } from "@repo/db";
import { cosmoSession, notification } from "@repo/db/schema";
import { and, isNull, sql } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { expiryNotices } from "@/lib/expiry-notice";
import { epochMs } from "@/lib/media-db";

import { mediaLog } from "./run";

/**
 * One notice per session per connect (Decision 15). The claim and the inserts share a
 * transaction, so a failed insert releases the claim, and `expiry_notified_at` (not the unread-only
 * `group_key` index) is what stops a second notice. Needs no Cosmo call, so a backoff never delays it.
 * The database's `now()` decides what is due, so the claim and the insert agree on one instant.
 */
export async function sendExpiryNotices() {
  try {
    const { userIds, count, ids } = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(cosmoSession)
        .set({ expiryNotifiedAt: sql`now()` })
        .where(
          and(
            isNull(cosmoSession.deadAt),
            isNull(cosmoSession.expiryNotifiedAt),
            sql`${cosmoSession.cookieExpiresAt} > now()`,
            sql`${cosmoSession.cookieExpiresAt} < now() + make_interval(days => ${RENEW_NOTICE_DAYS})`,
          ),
        )
        .returning({
          id: cosmoSession.id,
          userId: cosmoSession.userId,
          expiresAtMs: epochMs(cosmoSession.cookieExpiresAt).mapWith(Number),
        });
      const { rows, userIds } = expiryNotices(claimed);
      if (rows.length > 0) await tx.insert(notification).values(rows).onConflictDoNothing();
      return { userIds, count: claimed.length, ids: claimed.map((c) => c.id) };
    });
    if (count === 0) return;
    await publishUsers(userIds, { type: "notifications_changed" });
    mediaLog.info(`${count} expiry notices sent (sessions ${ids.join(", ")})`);
  } catch (error) {
    mediaLog.error(`Expiry notices failed: ${errorCode(error)}`);
  }
}
