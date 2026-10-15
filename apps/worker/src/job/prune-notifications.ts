import { RETENTION_DAYS } from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { notification, wantAlertSent } from "@repo/db/schema";
import { and, isNotNull, lt, or, sql } from "drizzle-orm";

import { log } from "../lib/log";

const cutoff = sql`now() - make_interval(days => ${RETENTION_DAYS})`;
const pruneLog = log("prune-notifications");

export async function pruneNotifications() {
  const notifications = await db
    .delete(notification)
    .where(and(isNotNull(notification.readAt), lt(notification.createdAt, cutoff)))
    .returning({ id: notification.id });
  // a key lives as long as both lists, so an entry removed and added again stays alerted
  // once; never by age
  const sent = await db
    .delete(wantAlertSent)
    .where(
      or(
        sql`NOT EXISTS (SELECT 1 FROM lists l WHERE l.id = ${wantAlertSent.wantListId})`,
        sql`NOT EXISTS (SELECT 1 FROM lists l WHERE l.id = ${wantAlertSent.sourceListId})`,
      ),
    )
    .returning({ wantListId: wantAlertSent.wantListId });

  if (notifications.length + sent.length === 0) return;
  pruneLog.info(
    `Deleted ${notifications.length} read notifications, ${sent.length} sent alert keys`,
  );
}
