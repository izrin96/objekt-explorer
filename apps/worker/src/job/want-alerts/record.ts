import { groupKey, mergePayload } from "@repo/api/lib/notification-group";
import { type AlertMatch, alertPayloadSchema } from "@repo/api/schemas/notification";
import { db } from "@repo/db";
import { notification, wantAlertSent } from "@repo/db/schema";
import { and, inArray, isNull, sql } from "drizzle-orm";

import { chunks, unique } from "../../lib/array";
import { type Alert, alertKeyId } from "../../lib/want-alert-match";

const WRITE_CHUNK = 1000;

export async function recordAlerts(alerts: Alert[], now: Date) {
  return db.transaction(async (tx) => {
    // runs that overlap queue here, and the later one finds its keys already sent
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('want-alerts'))`);

    // a key sent in this batch serves both directions; a later batch finds it sent
    const fresh = new Set<string>();
    for (const chunk of chunks(
      alerts.map((alert) => alert.key),
      WRITE_CHUNK,
    )) {
      const inserted = await tx
        .insert(wantAlertSent)
        .values(chunk)
        .onConflictDoNothing()
        .returning();
      for (const row of inserted) fresh.add(alertKeyId(row));
    }

    const groups = new Map<string, { alert: Alert; key: string; matches: AlertMatch[] }>();
    for (const alert of alerts) {
      if (!fresh.has(alertKeyId(alert.key))) continue;
      const key = groupKey(alert.type, alert.list.id, now);
      const group = groups.get(`${alert.userId}:${key}`);
      if (group) group.matches.push(alert.match);
      else groups.set(`${alert.userId}:${key}`, { alert, key, matches: [alert.match] });
    }

    for (const chunk of chunks([...groups.values()], WRITE_CHUNK)) {
      const existing = await tx
        .select({
          userId: notification.userId,
          groupKey: notification.groupKey,
          payload: notification.payload,
        })
        .from(notification)
        .where(
          and(
            inArray(
              notification.groupKey,
              chunk.map((group) => group.key),
            ),
            isNull(notification.readAt),
          ),
        )
        .for("update");
      const previousOf = new Map(existing.map((row) => [`${row.userId}:${row.groupKey}`, row]));

      // a fresh match lifts the notification back to the top of the list
      await tx
        .insert(notification)
        .values(
          chunk.map(({ alert, key, matches }) => {
            const previous = previousOf.get(`${alert.userId}:${key}`);
            const parsed = previous ? alertPayloadSchema.safeParse(previous.payload) : null;
            return {
              userId: alert.userId,
              type: alert.type,
              groupKey: key,
              payload: mergePayload(parsed?.success ? parsed.data : null, alert.list, matches),
            };
          }),
        )
        .onConflictDoUpdate({
          target: [notification.userId, notification.groupKey],
          targetWhere: isNull(notification.readAt),
          set: { payload: sql`excluded.payload`, createdAt: sql`now()` },
        });
    }

    return unique([...groups.values()].map(({ alert }) => alert.userId));
  });
}
