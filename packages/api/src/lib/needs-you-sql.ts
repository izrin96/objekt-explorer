import { sql } from "drizzle-orm";

/**
 * `heldCopyWhere`'s pending copy (`services/offer/verify.ts`), which the trade page reads: a copy
 * that has since verified a leg, of this trade or another, is no longer waiting on anyone.
 */
export const pendingCopy = sql`EXISTS (
  SELECT 1 FROM trade_substitute s
  WHERE s.trade_leg_id = l.id AND s.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM trade_leg v WHERE v.tx_hash = s.tx_hash AND v.verified_objekt_id = s.objekt_id
    )
)`;

/**
 * Something in conversation `c` waits on `me`: an open offer sent to them, or a running trade
 * whose partner asked to cancel it, or, with no request to cancel open (which outranks them, as
 * in `tradeStep`), holding a different copy for them to decide on or a leg they can send. The SQL
 * twin of `NEEDS_YOU_STATES`;
 * `needs-you-sql.test.ts` locks them together.
 */
export const needsYouSql = (me: string) => sql`EXISTS (
  SELECT 1 FROM offer o
  LEFT JOIN trade t ON t.offer_id = o.id
  WHERE o.conversation_id = c.id
    AND ((o.status = 'open' AND o.expires_at > now() AND o.to_user_id = ${me})
    OR (t.status = 'in_progress' AND EXISTS (
      SELECT 1 FROM trade_cancel_request r
      WHERE r.trade_id = t.id AND r.status = 'pending' AND r.asked_by <> ${me}
    ))
    OR (t.status = 'in_progress' AND NOT EXISTS (
      SELECT 1 FROM trade_cancel_request r WHERE r.trade_id = t.id AND r.status = 'pending'
    ) AND EXISTS (
      SELECT 1 FROM trade_leg l
      WHERE l.trade_id = t.id AND l.open AND l.verified_at IS NULL
        AND (
          (l.from_user_id <> ${me} AND ${pendingCopy})
          OR (l.from_user_id = ${me} AND l.untransferable_at IS NULL AND NOT ${pendingCopy})
        )
    )))
)`;
