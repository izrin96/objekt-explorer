import { groupKey, mergePayload } from "@repo/api/lib/notification-group";
import { type AlertMatch, alertPayloadSchema } from "@repo/api/schemas/notification";
import { hidesOfSql } from "@repo/api/services/trade/lists";
import { db, type Tx } from "@repo/db";
import { notification, wantAlertSent } from "@repo/db/schema";
import { and, inArray, isNull, sql } from "drizzle-orm";

import { chunks, unique } from "../../lib/array";
import { type Alert, alertKeyId, type Unhide } from "../../lib/want-alert-match";
import type { State } from "../../lib/want-alert-state";
import { saveProgress } from "./progress";

const WRITE_CHUNK = 1000;

export type RunProgress = { cursor: number; state: State; first: boolean };

/**
 * The alerts, the hidden posts brought back and the progress that produced them commit together,
 * on every run.
 */
export async function recordRun(
  alerts: Alert[],
  unhides: Unhide[],
  now: Date,
  progress: RunProgress,
) {
  return db.transaction(async (tx) => {
    // runs that overlap queue here, and the later one finds its keys already sent
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('want-alerts'))`);

    // before the alerts, so an alert never points at a post that is still hidden
    for (const chunk of chunks(unhides, WRITE_CHUNK)) await unhidePosts(tx, chunk, now);
    const notified = alerts.length === 0 ? [] : await insertAlerts(tx, alerts, now);
    await saveProgress(tx, progress);
    return notified;
  });
}

/** Drops each recipient's hide of the post that holds the list, however the hide names the post. */
async function unhidePosts(tx: Tx, unhides: Unhide[], now: Date) {
  await tx.execute(sql`
    DELETE FROM hidden_trade_post gone
    USING unnest(
      ${sql.param(unhides.map((unhide) => unhide.userId))}::text[],
      ${sql.param(unhides.map((unhide) => unhide.listId))}::int[]
    ) AS u(user_id, list_id)
    JOIN lists pl ON pl.id = u.list_id
    WHERE gone.user_id = u.user_id
      -- a hide made while this run was reading is newer than the entry it read
      AND gone.created_at < ${now.toISOString()}
      AND gone.list_id IN (SELECT hp.list_id ${hidesOfSql(sql`u.user_id`, "pl")})
  `);
}

async function insertAlerts(tx: Tx, alerts: Alert[], now: Date) {
  // a key sent in this batch serves both directions; a later batch finds it sent
  const fresh = new Set<string>();
  for (const chunk of chunks(
    alerts.map((alert) => alert.key),
    WRITE_CHUNK,
  )) {
    const inserted = await tx.insert(wantAlertSent).values(chunk).onConflictDoNothing().returning();
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
            payload: mergePayload(
              parsed?.success ? parsed.data : null,
              alert.list,
              matches,
              alert.mode,
            ),
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
}
