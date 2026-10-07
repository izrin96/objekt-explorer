import { RETENTION_DAYS } from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { notification, wantAlertSent } from "@repo/db/schema";
import { and, isNotNull, lt, or, sql } from "drizzle-orm";

const cutoff = sql`now() - make_interval(days => ${RETENTION_DAYS})`;

export async function pruneNotifications() {
  const notifications = await db
    .delete(notification)
    .where(and(isNotNull(notification.readAt), lt(notification.createdAt, cutoff)))
    .returning({ id: notification.id });
  // a key is kept while its pair can still match, so an alert stays once only; never by age
  const sent = await db
    .delete(wantAlertSent)
    .where(
      or(
        sql`NOT EXISTS (SELECT 1 FROM lists l WHERE l.id = ${wantAlertSent.wantListId})`,
        sql`NOT EXISTS (
          SELECT 1 FROM list_entries e
          WHERE e.list_id = ${wantAlertSent.sourceListId}
            AND e.collection_slug = ${wantAlertSent.collectionSlug}
        )`,
      ),
    )
    .returning({ wantListId: wantAlertSent.wantListId });

  console.log(
    `[Prune Notifications] Deleted ${notifications.length} read notifications, ${sent.length} sent alert keys`,
  );
}
