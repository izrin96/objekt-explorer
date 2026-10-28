import { db } from "@repo/db";
import { sql } from "drizzle-orm";

import { atFault, rateRefusal } from "../../lib/offer-rules";
import { DAY_MS } from "../../lib/time";
import type { DealRow } from "../../schemas/chat-deal";
import { RATE_WINDOW_DAYS, type TradeStatus } from "../../schemas/offer";

/**
 * `heldCopyWhere`'s pending copy (`services/trade-verify.ts`), which the trade page reads: a copy
 * that has since verified a leg, of this trade or another, is no longer waiting on anyone.
 */
const pendingCopy = sql`EXISTS (
  SELECT 1 FROM trade_substitute s
  WHERE s.trade_leg_id = l.id AND s.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM trade_leg v WHERE v.tx_hash = s.tx_hash AND v.verified_objekt_id = s.objekt_id
    )
)`;

/**
 * Something in conversation `c` waits on `me`: an open offer sent to them, or a running trade
 * holding a different copy for them to decide on or a leg they can send. The SQL twin of
 * `NEEDS_YOU_STATES`.
 */
export const needsYouSql = (me: string) => sql`EXISTS (
  SELECT 1 FROM offer o
  LEFT JOIN trade t ON t.offer_id = o.id
  WHERE o.conversation_id = c.id
    AND ((o.status = 'open' AND o.expires_at > now() AND o.to_user_id = ${me})
    OR (t.status = 'in_progress' AND EXISTS (
      SELECT 1 FROM trade_leg l
      WHERE l.trade_id = t.id AND l.open AND l.verified_at IS NULL
        AND (
          (l.from_user_id <> ${me} AND ${pendingCopy})
          OR (l.from_user_id = ${me} AND l.untransferable_at IS NULL AND NOT ${pendingCopy})
        )
    )))
)`;

type DealSqlRow = {
  conversation_id: number;
  offer_id: number;
  offer_status: string;
  offer_to: string;
  offer_expires_at: string;
  trade_id: number | null;
  trade_status: TradeStatus | null;
  user_a: string | null;
  user_b: string | null;
  accepted_at: string | null;
  ended_at: string | null;
  verified: number | null;
  total: number | null;
  confirmed: number | null;
  owed: number | null;
  sendable: number | null;
  stuck: number | null;
  to_decide: number | null;
  me_unverified: boolean | null;
  partner_unverified: boolean | null;
  rated: boolean | null;
};

/**
 * Each conversation's offers that may still be a deal (open, a running trade, or a trade ended
 * within the rating window), with their trades, by conversation id; one statement for the page.
 */
export async function readDeals(me: string, conversationIds: number[]) {
  const deals = new Map<number, DealRow[]>();
  if (conversationIds.length === 0) return deals;
  // the candidates first, materialized, so legs are counted for them only and not for every trade
  const result = await db.execute<DealSqlRow>(sql`
    WITH candidate AS MATERIALIZED (
      SELECT
        o.conversation_id,
        o.id AS offer_id,
        o.status AS offer_status,
        o.to_user_id AS offer_to,
        o.expires_at::text AS offer_expires_at,
        t.id AS trade_id,
        t.status AS trade_status,
        t.user_a,
        t.user_b,
        t.accepted_at::text AS accepted_at,
        t.ended_at::text AS ended_at
      FROM offer o
      LEFT JOIN trade t ON t.offer_id = o.id
      WHERE o.conversation_id = ANY(${sql.param(conversationIds)}::int[])
        AND (
          (o.status = 'open' AND o.expires_at > now())
          OR t.status = 'in_progress'
          OR (t.status IN ('completed', 'failed')
            AND t.ended_at > now() - ${RATE_WINDOW_DAYS} * interval '1 day')
        )
    )
    SELECT
      candidate.*,
      legs.*,
      EXISTS (
        SELECT 1 FROM trade_feedback f
        WHERE f.trade_id = candidate.trade_id AND f.from_user_id = ${me}
      ) AS rated
    FROM candidate
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE l.verified_at IS NOT NULL)::int AS verified,
        count(*)::int AS total,
        count(*) FILTER (WHERE l.confirmed_at IS NOT NULL)::int AS confirmed,
        count(*) FILTER (WHERE l.owed)::int AS owed,
        count(*) FILTER (WHERE l.owed AND l.untransferable_at IS NULL AND NOT l.pending)::int AS sendable,
        count(*) FILTER (WHERE l.owed AND l.untransferable_at IS NOT NULL)::int AS stuck,
        count(*) FILTER (
          WHERE l.from_user_id <> ${me} AND l.open AND l.verified_at IS NULL AND l.pending
        )::int AS to_decide,
        coalesce(bool_or(l.from_user_id = ${me} AND l.verified_at IS NULL), false) AS me_unverified,
        coalesce(bool_or(l.from_user_id <> ${me} AND l.verified_at IS NULL), false) AS partner_unverified
      FROM (
        SELECT l.*,
          l.from_user_id = ${me} AND l.open AND l.verified_at IS NULL AS owed,
          l.open AND ${pendingCopy} AS pending
        FROM trade_leg l WHERE l.trade_id = candidate.trade_id
      ) l
    ) legs ON candidate.trade_id IS NOT NULL
  `);
  const now = new Date();
  for (const row of result.rows) {
    const rows = deals.get(row.conversation_id) ?? [];
    deals.set(row.conversation_id, rows);
    rows.push({
      offerId: row.offer_id,
      offerStatus: row.offer_status,
      offerToId: row.offer_to,
      offerExpiresAt: row.offer_expires_at,
      trade:
        row.trade_id === null || row.trade_status === null
          ? null
          : {
              id: row.trade_id,
              status: row.trade_status,
              verified: row.verified ?? 0,
              total: row.total ?? 0,
              owed: row.owed ?? 0,
              sendable: row.sendable ?? 0,
              stuck: row.stuck ?? 0,
              toDecide: row.to_decide ?? 0,
              ...rating(me, row, now),
            },
    });
  }
  return deals;
}

/** `rateRefusal` over the leg summary: `atFault` only asks who still owed a leg. */
function rating(me: string, row: DealSqlRow, now: Date) {
  const { user_a: a, user_b: b, trade_status: status } = row;
  if (a === null || b === null || status === null || row.ended_at === null) {
    return { rateable: false, rateUntil: null };
  }
  const partner = a === me ? b : a;
  const owing = [
    ...(row.me_unverified ? [{ fromUserId: me, verifiedAt: null }] : []),
    ...(row.partner_unverified ? [{ fromUserId: partner, verifiedAt: null }] : []),
  ];
  const state = {
    status,
    acceptedAt: row.accepted_at!,
    endedAt: row.ended_at,
    verifiedLegs: 0,
    confirmedLegs: row.confirmed ?? 0,
  };
  const refusal = rateRefusal(state, now, me, atFault(owing, a, b));
  return {
    rateable: refusal === null && row.rated !== true,
    rateUntil: new Date(new Date(row.ended_at).getTime() + RATE_WINDOW_DAYS * DAY_MS).toISOString(),
  };
}
