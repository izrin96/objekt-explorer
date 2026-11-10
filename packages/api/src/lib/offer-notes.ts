import type { OfferPayload } from "../schemas/offer";

export type OfferRef = { id: number; conversationId: number; fromUserId: string; toUserId: string };

/** One notification per party of each offer, each naming the other. */
export function offerNotes(
  offers: OfferRef[],
  event: OfferPayload["event"],
  reason: OfferPayload["reason"],
  name: (userId: string) => { userId: string; name: string },
) {
  return offers.flatMap((o) =>
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
        event,
        reason,
        partner: name(other!),
      },
    })),
  );
}
