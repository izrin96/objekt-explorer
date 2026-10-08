import { db } from "@repo/db";
import { conversation, userSanction } from "@repo/db/schema";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { and, eq, sql } from "drizzle-orm";

import { pairKey } from "../../lib/chat-rules";
import { effectiveSanction } from "../../lib/sanctions";
import { redis } from "../redis";
import { activeSanctionWhere, notBlockedBy, notBlockedEither, notTradeSanctioned } from "../safety";
import { publishChatChanged } from "./notify";

/** Blocks between the pair, and the user's own chat mute in force. */
export async function chatSafety(userId: string, partnerId: string) {
  const [blocks, mutes] = await Promise.all([
    db.execute<{
      blocked: boolean;
      blocked_by_me: boolean;
      trade_blocked: boolean;
      partner_trade_blocked: boolean;
    }>(sql`
      SELECT NOT ${notBlockedEither(userId, partnerId)} AS blocked,
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
    blocked: row?.blocked ?? false,
    blockedByMe: row?.blocked_by_me ?? false,
    mute: effectiveSanction(mutes),
    tradeBlocked: row?.trade_blocked ?? false,
    partnerTradeBlocked: row?.partner_trade_blocked ?? false,
  };
}

/** The blocker's list and badge drop the conversation, and both sides' For you change. */
export async function afterBlockChange(blockerId: string, otherId: string) {
  const { userLow, userHigh } = pairKey(blockerId, otherId);
  const [row] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh)));
  await bumpTradeVersion(redis, [blockerId, otherId]);
  if (row) await publishChatChanged([blockerId], row.id);
}
