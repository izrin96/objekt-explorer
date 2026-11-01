import type { ListType } from "./list";
import { takesRatio } from "./trade-ratio";

export type CopyBinding = {
  listType: ListType;
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
export function carriesPrices(source: ListType, target: ListType) {
  return source === "sale" && target === "sale";
}

/** Ratios read by the list type, so a copy keeps them only as the same type of have or want list. */
export function carriesRatios(source: ListType, target: ListType) {
  return source === target && takesRatio(target);
}

export function copyUnit(mode: CopyMode) {
  // only a bound source's rows are copies; an unbound one's rows are collections
  return mode === "tokens" ? ("copies" as const) : ("collections" as const);
}
