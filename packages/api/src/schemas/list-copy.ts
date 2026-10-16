import type { ListTypeNew } from "./list";

export type CopyBinding = {
  listTypeNew: ListTypeNew;
  isProfileBind: boolean;
  profileAddress: string | null;
};

export type CopyMode = "rows" | "distinct-collections" | "tokens" | "expand";

export function copyMode(source: CopyBinding, target: CopyBinding): CopyMode {
  if (!target.isProfileBind) return source.isProfileBind ? "distinct-collections" : "rows";
  const sameProfile =
    source.isProfileBind &&
    source.profileAddress !== null &&
    source.profileAddress.toLowerCase() === target.profileAddress?.toLowerCase();
  return sameProfile ? "tokens" : "expand";
}

/** Whether the mode needs to know what the target's profile owns. */
export function needsHoldings(mode: CopyMode) {
  return mode === "tokens" || mode === "expand";
}

/** Price, quote-your-own-price and note only mean something on a sale list. */
export function carriesPrices(source: ListTypeNew, target: ListTypeNew) {
  return source === "sale" && target === "sale";
}

export function copyUnit(mode: CopyMode) {
  return mode === "rows" || mode === "tokens" ? ("copies" as const) : ("collections" as const);
}
