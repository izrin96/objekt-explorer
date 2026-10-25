import type { OfferItemView, OfferView } from "@repo/api/schemas/offer";

import type { OfferRequest } from "./offer-builder";
import { type Collections, pickKey } from "./pick";

/** The counter starts from this offer as the viewer sees it; the note is theirs, so it stays. */
export function counterRequest(
  offer: OfferView,
  name: string,
  collections: Collections,
): OfferRequest {
  const pick = (item: OfferItemView, kept = false) => ({
    key: pickKey(item),
    collectionSlug: item.collectionSlug,
    objektId: item.objektId,
    serial: item.serial,
    serialEstimated: item.serialEstimated,
    listSlug: item.listSlug,
    flags: null,
    kept,
  });
  return {
    to: { conversationId: offer.conversationId },
    name,
    counter: true,
    prefill: {
      // an any-copy ask stays, and the builder finds one of the viewer's copies for it
      give: offer.give.map((item) => pick(item)),
      get: offer.get.map((item) => pick(item, true)),
      topup: offer.topup
        ? {
            amount: Number(offer.topup.amount),
            currency: offer.topup.currency,
            payer: offer.topup.payer === "you" ? "from" : "to",
          }
        : undefined,
      collections,
    },
  };
}
