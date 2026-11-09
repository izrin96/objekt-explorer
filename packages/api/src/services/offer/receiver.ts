import { ORPCError } from "@orpc/server";
import { offer, trade, tradeLeg } from "@repo/db/schema";
import { eq, or } from "drizzle-orm";

import { refuseOffer } from "./core";

/** What a receiver's action on a leg reads: its trade, conversation and both sides of the leg. */
export const receiverLegColumns = {
  tradeId: trade.id,
  offerId: trade.offerId,
  conversationId: offer.conversationId,
  userA: trade.userA,
  userB: trade.userB,
  giverId: tradeLeg.fromUserId,
  receiverId: tradeLeg.toUserId,
};

export const partyTo = (me: string) => or(eq(trade.userA, me), eq(trade.userB, me));

/** NOT_FOUND unless the viewer is a party to the trade, `not_receiver` unless they receive the leg. */
export function receiverOnly<T extends { receiverId: string }>(row: T | undefined, me: string): T {
  if (!row) throw new ORPCError("NOT_FOUND");
  if (row.receiverId !== me) refuseOffer("not_receiver");
  return row;
}
