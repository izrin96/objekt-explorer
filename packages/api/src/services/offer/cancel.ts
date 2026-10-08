import { offer } from "@repo/db/schema";
import { and, eq, gt, or, sql } from "drizzle-orm";

import type { OfferCancelReason } from "../../schemas/offer";
import type { Tx } from "./core";
import { partyNames, writeNotes } from "./notes";
import { publishTouched } from "./state";

type CancelledOffer = { id: number; conversationId: number; fromUserId: string; toUserId: string };

/** Each party's "cancelled" note for every offer, naming the other party. */
export function cancelledNotes(
  cancelled: CancelledOffer[],
  reason: OfferCancelReason,
  nameOf: Awaited<ReturnType<typeof partyNames>>,
) {
  return cancelled.flatMap((o) =>
    [
      [o.fromUserId, o.toUserId],
      [o.toUserId, o.fromUserId],
    ].map(([userId, other]) => ({
      type: "offer" as const,
      userId: userId!,
      payload: {
        offerId: o.id,
        conversationId: o.conversationId,
        tradeId: null,
        event: "cancelled" as const,
        reason,
        partner: nameOf(other!),
      },
    })),
  );
}

export const cancelledColumns = {
  id: offer.id,
  conversationId: offer.conversationId,
  fromUserId: offer.fromUserId,
  toUserId: offer.toUserId,
};

/**
 * Cancels every open offer matching `where` with `reason`, notifying both parties of each,
 * inside the caller's transaction; the caller publishes the result after commit.
 */
export async function cancelOpenOffers(
  tx: Tx,
  where: ReturnType<typeof and>,
  reason: OfferCancelReason,
) {
  const cancelled = await tx
    .update(offer)
    .set({ status: "cancelled", cancelReason: reason, respondedAt: sql`now()` })
    .where(and(eq(offer.status, "open"), gt(offer.expiresAt, sql`now()`), where))
    .returning(cancelledColumns);
  if (cancelled.length === 0) return { conversations: [], notified: [] };
  const name = await partyNames(cancelled.flatMap((o) => [o.fromUserId, o.toUserId]));
  const notified = await writeNotes(tx, cancelledNotes(cancelled, reason, name));
  return {
    conversations: cancelled.map((o) => ({
      conversationId: o.conversationId,
      userIds: [o.fromUserId, o.toUserId],
    })),
    notified,
  };
}

export type CancelResult = Awaited<ReturnType<typeof cancelOpenOffers>>;

export const offersBetween = (a: string, b: string) =>
  or(
    and(eq(offer.fromUserId, a), eq(offer.toUserId, b)),
    and(eq(offer.fromUserId, b), eq(offer.toUserId, a)),
  );

export const offersOf = (userId: string) =>
  or(eq(offer.fromUserId, userId), eq(offer.toUserId, userId));

export async function publishCancelled(result: CancelResult) {
  await publishTouched(result.conversations, result.notified);
}
