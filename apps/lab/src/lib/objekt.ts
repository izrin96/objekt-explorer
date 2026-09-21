import type { LabObjekt } from "@/fixtures/objekts";

/** idntt seasons are named, not numbered: `Spring26` → `Sp26` */
const SEASON_SHORT_NAMES: Record<string, string> = {
  spring: "Sp",
  summer: "Su",
  autumn: "A",
  winter: "W",
};

/**
 * The season-coded collection number, e.g. `D207Z` (Divine01 207Z),
 * `A2 102Z` (Atom02 102Z), `Sp26 101Z` (Spring26 101Z).
 *
 * Port of `getCollectionShortId` in `apps/website/src/lib/objekt-utils.ts`,
 * minus the member name — every surface in the lab already shows the member
 * in its own slot.
 */
export function collectionShortNo(
  objekt: Pick<LabObjekt, "artist" | "season" | "collectionNo">,
): string {
  if (objekt.artist === "idntt") {
    const prefix = objekt.season.slice(0, -2).toLowerCase();
    const shortName = SEASON_SHORT_NAMES[prefix] ?? objekt.season.slice(0, -2);
    const year = objekt.season.slice(-2);
    return `${shortName}${year} ${objekt.collectionNo}`;
  }
  const seasonNumber = Number(objekt.season.slice(-2));
  if (seasonNumber < 2) return `${objekt.season.charAt(0)}${objekt.collectionNo}`;
  return `${objekt.season.charAt(0)}${seasonNumber} ${objekt.collectionNo}`;
}

/** the three kinds of ownership change both Activity surfaces and the drawer show */
export type EventKind = "mint" | "transfer" | "spin";

/**
 * The dot colour for an event row.
 *
 * `--success` / `--warning` are fill colours for a tinted chip, not ink: they
 * are the same pale pastel in both themes, so a solid dot painted with them
 * disappears on the light one. `*-foreground` is the half of each pair that
 * flips with the theme and is meant to read against the page.
 */
export const EVENT_COLOR: Record<EventKind, string> = {
  mint: "var(--success-foreground)",
  transfer: "var(--accent-solid)",
  spin: "var(--warning-foreground)",
};
