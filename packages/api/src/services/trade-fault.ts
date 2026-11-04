import { sql } from "drizzle-orm";

/**
 * Who is at fault in each failed trade: the side that still owed a transfer while the other had
 * delivered everything, null when both or neither owed. One definition for the reputation's
 * unfinished count and the staff area's repeat breakers, so the two never disagree.
 */
export const faultSql = sql`
      SELECT t.id AS trade_id,
        CASE
          WHEN a.owes AND NOT b.owes THEN t.user_a
          WHEN b.owes AND NOT a.owes THEN t.user_b
        END AS culprit
      FROM trade t
      CROSS JOIN LATERAL (
        SELECT coalesce(bool_or(l.verified_at IS NULL), false) AS owes
        FROM trade_leg l WHERE l.trade_id = t.id AND l.from_user_id = t.user_a
      ) a
      CROSS JOIN LATERAL (
        SELECT coalesce(bool_or(l.verified_at IS NULL), false) AS owes
        FROM trade_leg l WHERE l.trade_id = t.id AND l.from_user_id = t.user_b
      ) b
      WHERE t.status = 'failed'
    `;
