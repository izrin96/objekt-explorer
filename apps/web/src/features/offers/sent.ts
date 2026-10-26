import type { OfferItemView } from "@repo/api/schemas/offer";

/** Every objekt on both sides is a specific one its giver already sent, so Accept just records it. */
export function allSent(offer: { give: OfferItemView[]; get: OfferItemView[] }) {
  const items = [...offer.give, ...offer.get];
  return (
    offer.give.length > 0 &&
    offer.get.length > 0 &&
    items.every((item) => item.objektId !== null && item.sentAt !== null)
  );
}
