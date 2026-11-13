import type { ListType } from "@repo/api/schemas/list";
import { type OpenTo, openToOf } from "@repo/api/schemas/open-to";

type OpenToList = {
  listType: ListType;
  discoverable?: boolean | null;
  matchSale?: boolean | null;
  matchHave?: boolean | null;
};

/**
 * A want list's Open to while it is off Trade, where no post tag says it; null on Trade and for
 * every other type. A want list can always be on Trade, so `discoverable` alone decides.
 */
export function offTradeOpenTo(list: OpenToList): OpenTo | null {
  if (list.listType !== "want" || list.discoverable) return null;
  // a want list's defaults: Swaps or buying
  return openToOf({ matchSale: list.matchSale ?? true, matchHave: list.matchHave ?? true });
}
