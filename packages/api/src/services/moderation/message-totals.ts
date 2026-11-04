import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { type DayCount, fillDays, rangeDays, rangeStart } from "../../lib/staff-totals";
import { FLAG_CATEGORIES, type FlagCategory } from "../../schemas/chat";
import {
  MESSAGE_TOTAL_KEYS,
  type MessageTotals,
  MOST_FLAGGED_LIMIT,
  type StaffDays,
} from "../../schemas/staff-totals";
import { getCache } from "../redis";
import { staffPeople } from "./trade-tracking";

const TOTALS_TTL_SECONDS = 300;

// Counts only. Each query names its columns: no body, card, note, excerpt or sanction reason is
// ever selected, and a flag is never joined to its message.
async function countMessageTotals(days: StaffDays, now: Date): Promise<MessageTotals> {
  const start = sql`${rangeStart(days, now).toISOString()}::timestamptz`;
  const day = (column: string) => sql.raw(`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);
  const [totals, flagged] = await Promise.all([
    db.execute<DayCount>(sql`
      SELECT day, key, count(*)::int AS count FROM (
        -- an offer is counted on Trade tracking
        SELECT ${day("created_at")} AS day, 'messages' AS key
        FROM message WHERE created_at >= ${start} AND offer_id IS NULL
        UNION ALL
        -- a conversation starts with its first message or offer, not when Message opens it
        SELECT ${day("started_at")}, 'conversations'
        FROM conversation WHERE started_at >= ${start}
        UNION ALL
        SELECT ${day("f.created_at")}, k.key
        FROM message_flag f CROSS JOIN LATERAL (VALUES ('flags'), ('flag_' || f.category)) k(key)
        WHERE f.created_at >= ${start}
        UNION ALL
        SELECT ${day("r.created_at")}, k.key
        FROM report r CROSS JOIN LATERAL (VALUES ('reports'), ('report_' || r.reason)) k(key)
        WHERE r.created_at >= ${start}
        UNION ALL
        SELECT ${day("s.created_at")}, k.key
        FROM user_sanction s CROSS JOIN LATERAL (VALUES ('sanctions'), ('sanction_' || s.type)) k(key)
        WHERE s.created_at >= ${start}
      ) t GROUP BY day, key
    `),
    db.execute<{ user_id: string; category: FlagCategory; count: number; total: number }>(sql`
      WITH top AS (
        SELECT user_id, count(*)::int AS total FROM message_flag
        WHERE created_at >= ${start}
        GROUP BY user_id ORDER BY total DESC, user_id LIMIT ${MOST_FLAGGED_LIMIT}
      )
      SELECT f.user_id, f.category, count(*)::int AS count, top.total
      FROM message_flag f JOIN top ON top.user_id = f.user_id
      WHERE f.created_at >= ${start}
      GROUP BY f.user_id, f.category, top.total
    `),
  ]);

  const byUser = new Map<string, { counts: Record<FlagCategory, number>; total: number }>();
  for (const row of flagged.rows) {
    const entry = byUser.get(row.user_id) ?? {
      counts: Object.fromEntries(FLAG_CATEGORIES.map((c) => [c, 0])) as Record<
        FlagCategory,
        number
      >,
      total: row.total,
    };
    if (row.category in entry.counts) entry.counts[row.category] = row.count;
    byUser.set(row.user_id, entry);
  }
  const person = await staffPeople([...byUser.keys()]);
  return {
    days,
    countedAt: now.toISOString(),
    totals: fillDays(totals.rows, rangeDays(days, now), MESSAGE_TOTAL_KEYS),
    mostFlagged: [...byUser]
      .toSorted(([a, x], [b, y]) => y.total - x.total || (a < b ? -1 : a > b ? 1 : 0))
      .map(([userId, { counts, total }]) => ({ person: person(userId), counts, total })),
  };
}

/** Counted at most 5 minutes ago; the key carries the UTC day, so a new day counts afresh. */
export function messageTotals(days: StaffDays) {
  const now = new Date();
  const today = rangeDays(1, now)[0]!;
  return getCache(`mod:message-totals:1:${days}:${today}`, TOTALS_TTL_SECONDS, () =>
    countMessageTotals(days, now),
  );
}
