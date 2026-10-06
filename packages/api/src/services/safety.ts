import { userSanction } from "@repo/db/schema";
import { and, gt, isNull, ne, or, type SQL, sql } from "drizzle-orm";

type UserRef = SQL | string;

const ref = (user: UserRef) => (typeof user === "string" ? sql`${user}` : user);

/** Neither account has blocked the other. */
export function notBlockedEither(a: UserRef, b: UserRef) {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_block ub
    WHERE (ub.blocker_id = ${ref(a)} AND ub.blocked_id = ${ref(b)})
       OR (ub.blocker_id = ${ref(b)} AND ub.blocked_id = ${ref(a)})
  )`;
}

/** The viewer has not blocked the other account; what only the blocker's own views hide. */
export function notBlockedBy(viewerId: string, other: UserRef) {
  return sql`NOT EXISTS (
    SELECT 1 FROM user_block ub WHERE ub.blocker_id = ${viewerId} AND ub.blocked_id = ${ref(other)}
  )`;
}

/**
 * The one definition of an active sanction, over a `user_sanction` row: not revoked and not
 * past its end. A warn is a notice, never active.
 */
export const activeSanctionWhere = and(
  ne(userSanction.type, "warn"),
  isNull(userSanction.revokedAt),
  or(isNull(userSanction.expiresAt), gt(userSanction.expiresAt, sql`now()`)),
)!;

export function notTradeBlocked(user: UserRef) {
  return sql`NOT EXISTS (
    SELECT 1 FROM ${userSanction}
    WHERE ${userSanction.userId} = ${ref(user)}
      AND ${userSanction.type} = 'trade_block'
      AND ${activeSanctionWhere}
  )`;
}

/** Folded into Market's and Trade's shared cache keys, so a trade block applies on the next load. */
export const MARKET_VERSION_KEY = "market:v";
