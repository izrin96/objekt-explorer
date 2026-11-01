import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/** A have entry asks for more; a want entry or rule gives more. */
export type RatioSide = "have" | "want";

/** The ratio side of a Trade post side; a sale side carries none. */
export function ratioSideOf(role: string): RatioSide | null {
  return role === "have" || role === "want" ? role : null;
}

/** The ratio that applies: the entry's or rule's own, else the list's. Null is 1:1. */
export function appliedRatio(own: number | null | undefined, list: number | null | undefined) {
  if (own != null) return { ratio: own, inherited: false };
  if (list != null) return { ratio: list, inherited: true };
  return null;
}

/** A card standing for several copies shows the highest ratio among them, an own one over the list's. */
export function groupRatio(
  copies: readonly { ratio?: number | null }[],
  list: number | null | undefined,
) {
  let found: ReturnType<typeof appliedRatio> = null;
  for (const copy of copies) {
    const applied = appliedRatio(copy.ratio, list);
    if (
      applied &&
      (!found ||
        applied.ratio > found.ratio ||
        (applied.ratio === found.ratio && found.inherited && !applied.inherited))
    ) {
      found = applied;
    }
  }
  return found;
}

/** The chip, in the owner's give:get as Discord trades read it: `1:2` on a have, `2:1` on a want. */
export function ratioText(ratio: number, side: RatioSide) {
  return side === "have" ? `1:${ratio}` : `${ratio}:1`;
}

/** The chip's accessible name and tooltip. `inherited` names Ratio for all, for the owner only. */
export function ratioName(
  ratio: number,
  side: RatioSide,
  { owner, inherited = false }: { owner: boolean; inherited?: boolean },
) {
  const count = ratio;
  const name =
    side === "have"
      ? owner
        ? m.ratio_you_ask({ count })
        : m.ratio_they_ask({ count })
      : owner
        ? m.ratio_you_give({ count })
        : m.ratio_they_give({ count });
  return owner && inherited ? m.ratio_from_list({ name }) : name;
}

/**
 * The chip's text, then its words: the accessible name of the chip, and of a control that holds
 * one, so a voice command naming the visible `1:2` still finds it.
 */
export function ratioLabel(
  ratio: number,
  side: RatioSide,
  options: { owner: boolean; inherited?: boolean },
) {
  const name = ratioName(ratio, side, options);
  // `ratioName` opens a sentence; here it follows the chip's text
  const rest = name.charAt(0).toLocaleLowerCase(getLocale()) + name.slice(1);
  return m.ratio_option_name({ ratio: ratioText(ratio, side), name: rest });
}
