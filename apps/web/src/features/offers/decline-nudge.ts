// a toast closes on its timeout as on a dismissal, so a nudge counts as answered once shown
export const WANTED_RULE_NUDGE = "offer-rule-only-wanted-nudge";
export const ONE_POST_NUDGE = "offer-rule-one-post-nudge";

/**
 * The one notice a decline shows. Only offers with what I want goes first, and the one left out
 * stays unshown for a later decline.
 */
export function declineNudge(
  offer: { suggestWantedOnly?: boolean; suggestOnePost?: boolean },
  dismissed: readonly string[],
): "wanted" | "one-post" | null {
  if (offer.suggestWantedOnly && !dismissed.includes(WANTED_RULE_NUDGE)) return "wanted";
  if (offer.suggestOnePost && !dismissed.includes(ONE_POST_NUDGE)) return "one-post";
  return null;
}
