import type { ListType } from "./list";

/** A want list's Open to as stored: whether sale lists match it, and whether have lists do. */
export type OpenToFlags = { matchSale: boolean; matchHave: boolean };

/** Swaps only, Swaps or buying, Buying only. */
export type OpenTo = "swaps" | "both" | "buying";

const FLAGS: Record<OpenTo, OpenToFlags> = {
  swaps: { matchSale: false, matchHave: true },
  both: { matchSale: true, matchHave: true },
  buying: { matchSale: true, matchHave: false },
};

/** `lists_open_to_something` keeps both flags from being false; if a row ever has, it reads as buying. */
export function openToOf({ matchSale, matchHave }: OpenToFlags): OpenTo {
  if (!matchHave) return "buying";
  return matchSale ? "both" : "swaps";
}

/** Reads one value per Open to, whichever way the list's flags are held. */
export function pickByOpenTo<T>(flags: OpenToFlags, byOpenTo: Record<OpenTo, T>): T {
  return byOpenTo[openToOf(flags)];
}

/** A want list linked to a have list is someone trading, so it must stay open to swaps: Buying only is refused. */
export function pairRefusesOpenTo(want: OpenToFlags): boolean {
  return !want.matchHave;
}

export function flagsOf(openTo: OpenTo): OpenToFlags {
  return { ...FLAGS[openTo] };
}

/** A want list's Open to as saved. A list open to nothing would break `lists_open_to_something`, so a want list that stops matching sale lists always matches have lists. */
export function resolveOpenTo(listType: ListType, input: OpenToFlags): OpenToFlags {
  if (listType !== "want") return flagsOf("both");
  return { matchSale: input.matchSale, matchHave: input.matchSale ? input.matchHave : true };
}

export type OpenToEdit =
  | { action: "keep" }
  | { action: "refuse" }
  | { action: "write"; flags: OpenToFlags };

/**
 * What `list.edit` does with the Open to it is sent. Only a want list off Trade takes one: on Trade
 * its post sets it, and an old tab or a post that went up meanwhile must not fail the whole save.
 * A pair's want side can't be Buying only.
 */
export function openToEdit(
  list: { listType: ListType; discoverable: boolean; linkedListId: number | null },
  openTo: OpenTo | undefined,
): OpenToEdit {
  if (openTo === undefined || list.listType !== "want" || list.discoverable) {
    return { action: "keep" };
  }
  const flags = flagsOf(openTo);
  if (list.linkedListId !== null && pairRefusesOpenTo(flags)) return { action: "refuse" };
  return { action: "write", flags };
}

/** A sale list's Open to: Sell only, or Sell or swap (`takes_swaps`). */
export type SaleOpenTo = "sell" | "both";

export const saleOpenToOf = (list: { takesSwaps?: boolean | null }): SaleOpenTo =>
  list.takesSwaps ? "both" : "sell";

/**
 * Whether a list's objekts can be swapped for: a have list always, a sale list when it takes
 * swaps. The TS twin of `offersSwapsSql` (lib/trade-sql.ts), which `lib/trade-sql.test.ts` locks to it.
 */
export function offersSwaps(list: { listType: ListType; takesSwaps?: boolean | null }) {
  return list.listType === "have" || (list.listType === "sale" && list.takesSwaps === true);
}
