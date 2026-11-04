import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { isBehind } from "../../lib/indexer-seen";
import { type DayCount, fillDays, percentile, rangeDays, rangeStart } from "../../lib/staff-totals";
import { awayBreaksAt, VERIFIER_LAST_KEY } from "../../schemas/offer";
import {
  ATTENTION_LIMIT,
  type AttentionReason,
  OFFER_TOTAL_KEYS,
  REPEAT_BREAKER_LIMIT,
  REPEAT_BREAKER_MIN,
  STALLED_DAYS,
  type StaffDays,
  TRADE_TOTAL_KEYS,
  type TrackerHealth,
  type TradeAttention,
  type TradeTotals,
} from "../../schemas/staff-totals";
import { fetchPartners } from "../chat";
import { readIndexerSeen } from "../offer/trades";
import { getCache, redis, redisFailOpen } from "../redis";
import { faultSql } from "../trade-fault";

const TOTALS_TTL_SECONDS = 300;

const utcDay = (column: ReturnType<typeof sql.raw>) =>
  sql`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

const isoParam = (at: Date) => sql`${at.toISOString()}::timestamptz`;

/** An account's id and current name, as the console names it; null once the account is gone. */
export async function staffPeople(userIds: string[]) {
  const partners = await fetchPartners(userIds);
  return (userId: string) => ({ userId, name: partners.get(userId)?.identity?.name ?? null });
}

async function countTradeTotals(days: StaffDays, now: Date): Promise<TradeTotals> {
  const start = isoParam(rangeStart(days, now));
  const [offers, trades, durations] = await Promise.all([
    db.execute<DayCount>(sql`
      SELECT day, key, count(*)::int AS count FROM (
        SELECT ${utcDay(sql.raw("created_at"))} AS day, 'created' AS key
        FROM offer WHERE created_at >= ${start}
        UNION ALL
        SELECT ${utcDay(sql.raw("responded_at"))}, status
        FROM offer WHERE responded_at >= ${start} AND status <> 'open'
        UNION ALL
        SELECT ${utcDay(sql.raw("responded_at"))}, 'cancelled_' || cancel_reason
        FROM offer
        WHERE responded_at >= ${start} AND status = 'cancelled' AND cancel_reason IS NOT NULL
      ) t GROUP BY day, key
    `),
    db.execute<DayCount>(sql`
      WITH ended AS (
        SELECT ${utcDay(sql.raw("ended_at"))} AS day, status, cancel_reason
        FROM trade WHERE ended_at >= ${start} AND status <> 'in_progress'
      )
      SELECT day, key, count(*)::int AS count FROM (
        SELECT day, status AS key FROM ended
        UNION ALL
        SELECT day, 'cancelled_' || cancel_reason FROM ended
        WHERE status = 'cancelled' AND cancel_reason IS NOT NULL
        UNION ALL
        -- a break leaves the reason null; expiry writes 'expired'
        SELECT day, 'failed_' || coalesce(cancel_reason, 'broken') FROM ended
        WHERE status = 'failed'
      ) t GROUP BY day, key
    `),
    // a trade completed through a confirmed leg counts here, unlike in the reputation
    db.execute<{ seconds: number }>(sql`
      SELECT extract(epoch FROM ended_at - accepted_at)::float8 AS seconds
      FROM trade WHERE status = 'completed' AND ended_at >= ${start}
      ORDER BY 1
    `),
  ]);
  const dayList = rangeDays(days, now);
  const seconds = durations.rows.map((row) => Number(row.seconds));
  return {
    days,
    countedAt: now.toISOString(),
    offers: fillDays(offers.rows, dayList, OFFER_TOTAL_KEYS),
    trades: fillDays(trades.rows, dayList, TRADE_TOTAL_KEYS),
    timeToComplete: {
      count: seconds.length,
      medianSeconds: percentile(seconds, 0.5),
      p90Seconds: percentile(seconds, 0.9),
    },
  };
}

/** Counted at most 5 minutes ago; the key carries the UTC day, so a new day counts afresh. */
export function tradeTotals(days: StaffDays) {
  const now = new Date();
  const today = rangeDays(1, now)[0]!;
  return getCache(`mod:trade-totals:1:${days}:${today}`, TOTALS_TTL_SECONDS, () =>
    countTradeTotals(days, now),
  );
}

type AttentionRow = {
  id: number;
  status: TradeAttention["rows"][number]["status"];
  accepted_at: string;
  user_a: string;
  user_b: string;
  total: number;
  legs_done: number;
  legs_total: number;
  reasons: { reason: AttentionReason; at: string | null }[];
};

async function attentionRows(start: Date) {
  // away, stuck, copy and cancel_ask count only while the trade runs: a pending copy or
  // request can outlive its trade
  const result = await db.execute<AttentionRow>(sql`
    WITH reasons AS (
      SELECT id AS trade_id, 'stalled' AS reason, accepted_at AS at FROM trade
      WHERE status = 'in_progress' AND accepted_at <= now() - make_interval(days => ${STALLED_DAYS})
      UNION ALL
      SELECT id, 'failed', ended_at FROM trade
      WHERE status = 'failed' AND ended_at >= ${isoParam(start)}
      UNION ALL
      SELECT l.trade_id, 'away', l.away_at FROM trade_leg l JOIN trade t ON t.id = l.trade_id
      WHERE t.status = 'in_progress' AND l.open AND l.away_at IS NOT NULL
      UNION ALL
      SELECT l.trade_id, 'stuck', l.untransferable_at FROM trade_leg l JOIN trade t ON t.id = l.trade_id
      WHERE t.status = 'in_progress' AND l.open AND l.untransferable_at IS NOT NULL
      UNION ALL
      SELECT l.trade_id, 'copy', s.accept_by FROM trade_substitute s
      JOIN trade_leg l ON l.id = s.trade_leg_id JOIN trade t ON t.id = l.trade_id
      WHERE t.status = 'in_progress' AND l.open AND s.status = 'pending'
      UNION ALL
      SELECT r.trade_id, 'cancel_ask', r.asked_at FROM trade_cancel_request r
      JOIN trade t ON t.id = r.trade_id
      WHERE t.status = 'in_progress' AND r.status = 'pending'
    ),
    picked AS (
      SELECT t.id, t.status, t.accepted_at, t.user_a, t.user_b, count(*) OVER ()::int AS total
      FROM trade t WHERE t.id IN (SELECT trade_id FROM reasons)
      ORDER BY t.accepted_at, t.id
      LIMIT ${ATTENTION_LIMIT}
    )
    SELECT p.id, p.status, p.accepted_at::text AS accepted_at, p.user_a, p.user_b, p.total,
      (SELECT count(*) FILTER (WHERE l.verified_at IS NOT NULL)::int FROM trade_leg l
        WHERE l.trade_id = p.id) AS legs_done,
      (SELECT count(*)::int FROM trade_leg l WHERE l.trade_id = p.id) AS legs_total,
      (SELECT json_agg(json_build_object('reason', r.reason, 'at', r.at) ORDER BY r.at)
        FROM reasons r WHERE r.trade_id = p.id) AS reasons
    FROM picked p
    ORDER BY p.accepted_at, p.id
  `);
  return result.rows;
}

/** One entry per reason, the earliest time of each (two away legs read as one away reason). */
function foldReasons(reasons: AttentionRow["reasons"]) {
  const folded = new Map<AttentionReason, string | null>();
  for (const { reason, at } of reasons) {
    const time =
      at === null ? null : reason === "away" ? awayBreaksAt(at) : new Date(at).toISOString();
    const kept = folded.get(reason);
    if (kept === undefined || kept === null || (time !== null && time < kept)) {
      folded.set(reason, time);
    }
  }
  return [...folded].map(([reason, at]) => ({ reason, at }));
}

async function repeatBreakers(start: Date) {
  const result = await db.execute<{ user_id: string; failed: number }>(sql`
    SELECT f.culprit AS user_id, count(*)::int AS failed
    FROM (${faultSql}) f JOIN trade t ON t.id = f.trade_id
    WHERE f.culprit IS NOT NULL AND t.ended_at >= ${isoParam(start)}
    GROUP BY f.culprit
    HAVING count(*) >= ${REPEAT_BREAKER_MIN}
    ORDER BY failed DESC, user_id
    LIMIT ${REPEAT_BREAKER_LIMIT}
  `);
  return result.rows;
}

/** Live: staff open it to act. */
export async function tradeAttention(days: StaffDays): Promise<TradeAttention> {
  const start = rangeStart(days, new Date());
  const [rows, breakers] = await Promise.all([attentionRows(start), repeatBreakers(start)]);
  const person = await staffPeople([
    ...rows.flatMap((row) => [row.user_a, row.user_b]),
    ...breakers.map((row) => row.user_id),
  ]);
  return {
    rows: rows.map((row) => ({
      tradeId: row.id,
      status: row.status,
      acceptedAt: new Date(row.accepted_at).toISOString(),
      parties: [person(row.user_a), person(row.user_b)],
      legsDone: row.legs_done,
      legsTotal: row.legs_total,
      reasons: foldReasons(row.reasons ?? []),
    })),
    total: rows[0]?.total ?? 0,
    repeatBreakers: breakers.map((row) => ({ person: person(row.user_id), failed: row.failed })),
  };
}

const validTime = (value: string | null) => {
  if (value === null) return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
};

/** What the verifier stores, read as it is: a reading that can't be read is unknown. */
export async function trackerHealth(): Promise<TrackerHealth> {
  const [seen, lastRun, counts] = await Promise.all([
    readIndexerSeen(),
    redisFailOpen("verifier last", () => redis.get(VERIFIER_LAST_KEY)),
    db.execute<TrackerHealth["open"]>(sql`
      SELECT count(*)::int AS legs,
        count(*) FILTER (WHERE l.away_at IS NOT NULL)::int AS away,
        count(*) FILTER (WHERE l.untransferable_at IS NOT NULL)::int AS stuck,
        (SELECT count(*)::int FROM trade_substitute s
          JOIN trade_leg sl ON sl.id = s.trade_leg_id JOIN trade st ON st.id = sl.trade_id
          WHERE s.status = 'pending' AND sl.open AND st.status = 'in_progress') AS copies
      FROM trade_leg l JOIN trade t ON t.id = l.trade_id
      WHERE l.open AND t.status = 'in_progress'
    `),
  ]);
  const now = Date.now();
  const seenUntil = validTime(seen?.seenUntil ?? null);
  const readAt = validTime(seen?.readAt ?? null);
  return {
    checkedAt: new Date(now).toISOString(),
    // `isBehind` reads null as behind, to fail safe; staff see unknown instead
    indexer:
      seen === null || seenUntil === null || readAt === null
        ? { state: "unknown" }
        : { state: "known", seenUntil, readAt, behind: isBehind(seen, now) },
    verifierLastRun: validTime(lastRun),
    open: counts.rows[0] ?? { legs: 0, away: 0, stuck: 0, copies: 0 },
  };
}
