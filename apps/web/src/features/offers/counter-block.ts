import type { OfferView } from "@repo/api/schemas/offer";

/**
 * Why the viewer can't counter an open offer made to them, read off its actions: a chat mute
 * leaves Accept and Decline, a trade block only Decline (`allowedActions`). Null when Counter is
 * there, or the offer is no longer open or not theirs to answer.
 */
export function counterBlockOf(
  offer: Pick<OfferView, "status" | "mine" | "actions">,
): "muted" | "trade_blocked" | null {
  if (offer.status !== "open" || offer.mine || offer.actions.includes("counter")) return null;
  if (offer.actions.includes("accept")) return "muted";
  return offer.actions.includes("decline") ? "trade_blocked" : null;
}
