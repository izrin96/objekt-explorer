import type { OfferPayload } from "@repo/api/schemas/offer";

import type { Publish } from "./trade-publish";

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

export const toPublish = (offers: OfferRef[], notified: string[]): Publish => ({
  notified,
  conversations: offers.map((o) => ({ id: o.conversationId, userIds: [o.fromUserId, o.toUserId] })),
});

/** The earliest of several date strings. */
export const earliest = (dates: string[]) =>
  dates.reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b));
