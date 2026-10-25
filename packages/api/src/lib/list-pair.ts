import type { ListType } from "../schemas/list";
import { type OpenToFlags, pairRefusesOpenTo } from "../schemas/open-to";

export type PairRefusal =
  | "list_have_links_want"
  | "list_want_links_have"
  | "list_sale_links_sell_only"
  | "list_pair_buying_only";

type Linked = OpenToFlags & { listType: ListType; takesSwaps: boolean };

/**
 * Why a list of `type`, about to save `own`, can't link to `linked`, or null when it can. Have
 * and sale lists link to a want list, and a want list to a have list or a sale list; a sale list
 * in a pair takes swaps, and the pair's want side is never Buying only.
 */
export function pairRefusal(
  type: ListType,
  own: { openTo: OpenToFlags; takesSwaps: boolean },
  linked: Linked,
): PairRefusal | null {
  if ((type === "have" || type === "sale") && linked.listType !== "want") {
    return "list_have_links_want";
  }
  if (type === "want" && linked.listType !== "have" && linked.listType !== "sale") {
    return "list_want_links_have";
  }
  const sellOnly =
    type === "sale" ? !own.takesSwaps : linked.listType === "sale" && !linked.takesSwaps;
  if (sellOnly) return "list_sale_links_sell_only";
  if (pairRefusesOpenTo(type === "want" ? own.openTo : linked)) return "list_pair_buying_only";
  return null;
}
