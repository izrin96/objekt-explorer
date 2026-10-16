import type { ListTypeNew } from "./list";

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

export function flagsOf(openTo: OpenTo): OpenToFlags {
  return { ...FLAGS[openTo] };
}

/** A want list's Open to as saved. A list open to nothing would break `lists_open_to_something`, so a want list that stops matching sale lists always matches have lists. */
export function resolveOpenTo(
  listType: ListTypeNew,
  input: Partial<OpenToFlags>,
  current?: OpenToFlags,
): OpenToFlags {
  if (listType !== "want") return flagsOf("both");
  const matchSale = input.matchSale ?? current?.matchSale ?? false;
  const matchHave = matchSale ? (input.matchHave ?? current?.matchHave ?? true) : true;
  return { matchSale, matchHave };
}
