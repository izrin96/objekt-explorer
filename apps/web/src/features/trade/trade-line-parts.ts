import type { ListType } from "@repo/api/schemas/list";
import type { TradeLine } from "@repo/api/schemas/trade-post";

export type DetailPart =
  | "sell_only"
  | "sell_or_swap"
  | "partner"
  | "also_pay"
  | "buying_only"
  | "market";
export type LineHint =
  | "paired_off_swap"
  | "paired_off_sell"
  | "needs_profile"
  | "not_on"
  | "not_on_sale";

/**
 * The detail line of a list in a post. Open to and Market are the sale list's own, so a want list
 * in a Sell post leaves them out: `line.kind` is the post's, not this list's.
 */
export function lineDetail(
  line: Extract<TradeLine, { state: "in_post" }>,
  listType: ListType,
): DetailPart[] {
  const isSale = listType === "sale";
  const parts: (DetailPart | null)[] = [
    isSale ? (line.alsoSwap ? "sell_or_swap" : "sell_only") : null,
    line.partner ? "partner" : null,
    line.alsoPay ? "also_pay" : null,
    line.kind === "buy" ? "buying_only" : null,
    isSale ? "market" : null,
  ];
  return parts.filter((part) => part !== null);
}

/** The hint of a list in no post; a pair with a sale list comes back as a Sell post from either half. */
export function lineHint(
  line: Exclude<TradeLine, { state: "in_post" }>,
  listType: ListType,
): LineHint {
  switch (line.state) {
    case "paired_off":
      return listType === "sale" || line.partner.listType === "sale"
        ? "paired_off_sell"
        : "paired_off_swap";
    case "needs_profile":
      return "needs_profile";
    case "off":
      return listType === "sale" ? "not_on_sale" : "not_on";
  }
}
