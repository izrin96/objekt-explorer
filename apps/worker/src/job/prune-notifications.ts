import { RETENTION_DAYS } from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { notification, wantAlertSent } from "@repo/db/schema";
import { and, isNotNull, lt, sql } from "drizzle-orm";

const cutoff = sql`now() - make_interval(days => ${RETENTION_DAYS})`;

export async function pruneNotifications() {
  const notifications = await db
    .delete(notification)
    .where(and(isNotNull(notification.readAt), lt(notification.createdAt, cutoff)))
    .returning({ id: notification.id });
  const sent = await db
    .delete(wantAlertSent)
    .where(lt(wantAlertSent.createdAt, cutoff))
    .returning({ wantListId: wantAlertSent.wantListId });

  console.log(
    `[Prune Notifications] Deleted ${notifications.length} read notifications, ${sent.length} sent alert keys`,
  );
}
