import { db, type Tx } from "@repo/db";
import { conversation, user, userSanction } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { pairKey } from "../../lib/chat-rules";
import { effectiveSanction } from "../../lib/sanctions";
import { lockUsersShared } from "../account/cosmo-link";
import {
  activeSanctionWhere,
  banned,
  notBlockedBy,
  notBlockedEither,
  notTradeSanctioned,
} from "../moderation/safety";
import { bumpTradeVersions } from "../moderation/safety-cache";
import { publishChatChanged } from "./notify";

/** Blocks between the pair, and the user's own chat mute in force. A deleted or banned partner reads as a block. */
export async function chatSafety(userId: string, partnerId: string) {
  const [blocks, mutes] = await Promise.all([
    db.execute<{
      blocked: boolean;
      blocked_by_me: boolean;
      trade_blocked: boolean;
      partner_trade_blocked: boolean;
      partner_deleted: boolean;
      partner_banned: boolean;
    }>(sql`
      SELECT NOT ${notBlockedEither(userId, partnerId)} AS blocked,
        EXISTS (
          SELECT 1 FROM ${user} WHERE ${user.id} = ${partnerId} AND ${user.deletedAt} IS NOT NULL
        ) AS partner_deleted,
        ${banned(partnerId)} AS partner_banned,
        NOT ${notBlockedBy(userId, partnerId)} AS blocked_by_me,
        NOT ${notTradeSanctioned(userId)} AS trade_blocked,
        NOT ${notTradeSanctioned(partnerId)} AS partner_trade_blocked
    `),
    db
      .select({ reason: userSanction.reason, expiresAt: userSanction.expiresAt })
      .from(userSanction)
      .where(
        and(
          eq(userSanction.userId, userId),
          eq(userSanction.type, "chat_mute"),
          activeSanctionWhere,
        ),
      ),
  ]);
  const [row] = blocks.rows;
  return {
    blocked:
      (row?.blocked ?? false) || (row?.partner_deleted ?? false) || (row?.partner_banned ?? false),
    partnerDeleted: row?.partner_deleted ?? false,
    /** a block either way, apart from a deleted or banned partner */
    blockedEitherWay: row?.blocked ?? false,
    blockedByMe: row?.blocked_by_me ?? false,
    mute: effectiveSanction(mutes),
    tradeBlocked: row?.trade_blocked ?? false,
    partnerTradeBlocked: row?.partner_trade_blocked ?? false,
  };
}

/**
 * `chatSafety`'s `blocked` again inside a send's transaction, after both user rows are held
 * `FOR SHARE`: a block between the two, the partner's ban, or either account deleted. A block
 * locks both rows `FOR NO KEY UPDATE` before writing, a ban the banned user's row, and a
 * deletion's scrub the deleted user's row, so each either committed before this read or waits
 * behind the send. The sender's own ban is not re-read: like `chatSafety`, it relies on the
 * ban ending the sender's sessions. A mute is not re-read, as `refuseUnsafeIn` explains for offers.
 */
export async function blockedIn(tx: Tx, userId: string, partnerId: string) {
  const users = await lockUsersShared(tx, [userId, partnerId]);
  if (users.some((row) => row.deleted_at !== null)) return true;
  // a separate statement from the lock: under read committed it takes a snapshot after the
  // lock wait, so a block committed while the send waited is seen; one merged statement would miss it
  const { rows } = await tx.execute<{ blocked: boolean }>(sql`
    SELECT NOT ${notBlockedEither(userId, partnerId)} OR ${banned(partnerId)} AS blocked
  `);
  return rows[0]?.blocked ?? false;
}

/** The blocker's list and badge drop the conversation, and both sides' For you change. */
export async function afterBlockChange(blockerId: string, otherId: string) {
  const { userLow, userHigh } = pairKey(blockerId, otherId);
  const [row] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  await bumpTradeVersions([blockerId, otherId]);
  if (row) await publishChatChanged([blockerId], row.id);
}
