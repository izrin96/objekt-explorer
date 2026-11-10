import type { OfferRef } from "@repo/api/lib/offer-notes";

import type { Publish } from "./trade-publish";

export const toPublish = (offers: OfferRef[], notified: string[]): Publish => ({
  notified,
  conversations: offers.map((o) => ({ id: o.conversationId, userIds: [o.fromUserId, o.toUserId] })),
});

/** The earliest of several date strings. */
export const earliest = (dates: string[]) =>
  dates.reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b));
