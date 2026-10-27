import type { ComposerStart } from "@repo/api/schemas/trade-post";

import type { NearVerb } from "./near";

/** How the viewer makes a near match count, on their own side. */
export type NearFix = "sale-list" | "open-sale" | "open-want-swaps" | "open-want-buying";

/** A want strip's near match is the viewer's copy; any other strip's is on the viewer's want list. */
export function nearFixOf(verb: NearVerb, role: "have" | "want" | "sale"): NearFix {
  if (verb === "sell") return "sale-list";
  if (verb === "buy") return "open-want-buying";
  return role === "want" ? "open-sale" : "open-want-swaps";
}

/**
 * The composer as a fix opens it: the post holding the viewer's list, opened the other way. A
 * Sell post takes swaps. A want list's post also pays, and a Buy post, or a want list on no post,
 * becomes a Swap that also pays, so it keeps buying.
 */
export function nearFixStart(
  start: ComposerStart,
  fix: Exclude<NearFix, "sale-list">,
): ComposerStart {
  if (fix === "open-sale") return { ...start, kind: "sell", alsoSwap: true };
  const kind = start.kind === null || start.kind === "buy" ? "swap" : start.kind;
  return { ...start, kind, alsoPay: true };
}
