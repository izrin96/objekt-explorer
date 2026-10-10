import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversation, offer } from "@repo/db/schema";
import { and, eq, or, sql } from "drizzle-orm";

import { type ActorLimits, actionRefusal } from "../../lib/offer-rules";
import { unique } from "../../lib/unique";
import { publishNotify } from "../../realtime";
import type { OfferAction, OfferStatus } from "../../schemas/offer";
import { publishChatChanged } from "../chat";
import { type Tx, refuseOffer } from "./core";

export type OfferRow = {
  id: number;
  conversationId: number;
  fromUserId: string;
  toUserId: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
};

export const offerRowColumns = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
  status: sql<OfferStatus>`${offer.status}`,
  expiresAt: offer.expiresAt,
  createdAt: offer.createdAt,
};

/** NOT_FOUND unless the viewer is one of the offer's two parties. */
export async function findOffer(offerId: number, me: string): Promise<OfferRow> {
  const [row] = await db
    .select(offerRowColumns)
    .from(offer)
    .where(and(eq(offer.id, offerId), or(eq(offer.fromUserId, me), eq(offer.toUserId, me))));
  if (!row) throw new ORPCError("NOT_FOUND");
  return row;
}

export async function lockConversation(tx: Tx, conversationId: number) {
  await tx
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.id, conversationId))
    .for("update");
}

export const refuseAction = (
  row: OfferRow,
  me: string,
  action: OfferAction,
  now: Date,
  limits: ActorLimits = {},
) => {
  const reason = actionRefusal(row, me, action, now, limits);
  if (reason) refuseOffer(reason);
};

/** The pair's chat and both members' bells hear about every offer a change touched. */
export async function publishTouched(
  conversations: { conversationId: number; userIds: string[] }[],
  notified: string[],
) {
  await Promise.all([
    ...conversations.map((c) => publishChatChanged(c.userIds, c.conversationId)),
    ...unique(notified).map((userId) => publishNotify(userId)),
  ]);
}
