import chroma, { type Color } from "chroma-js";
import { useEffect } from "react";
import { create } from "zustand";

import type { LabArtist, LabObjekt } from "@/fixtures/objekts";

export const SORTS = [
  "newest",
  "received",
  "serial",
  "member",
  "season",
  "collectionNo",
  "duplicate",
  "floor",
] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = {
  newest: "Newest",
  received: "Received",
  serial: "Serial",
  member: "Member",
  season: "Season",
  collectionNo: "Collection No.",
  duplicate: "Duplicate",
  floor: "Floor price",
};

/**
 * Direction is its own field rather than a pair of sort entries, so the
 * toolbar can show one arrow button. Picking a sort resets the direction to
 * the one that sort is normally read in: newest-first for dates, A→Z and 1→n
 * for everything else.
 */
export const SORT_DEFAULT_DESC: Record<Sort, boolean> = {
  newest: true,
  received: true,
  serial: false,
  member: false,
  season: false,
  collectionNo: false,
  duplicate: true,
  floor: false,
};

/** which sorts each surface offers; the sort Select normalises the store back into range */
export const HOME_SORTS: readonly Sort[] = ["newest", "serial", "member"];
export const MARKET_SORTS: readonly Sort[] = ["floor", "newest"];
export const PROFILE_SORTS: readonly Sort[] = [
  "received",
  "serial",
  "member",
  "season",
  "collectionNo",
  "duplicate",
];

export const COLUMNS = [4, 6, 8] as const;
export type Columns = (typeof COLUMNS)[number];

/**
 * `validType` in `apps/website/src/lib/universal/transfers.ts`. The four
 * non-`all` values are mutually exclusive on the server (`getTypeFilters`),
 * which is what lets one field name a row's kind rather than a set of flags.
 */
export const TRANSFER_TYPES = ["all", "mint", "received", "sent", "spin"] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

/**
 * `trades_filter_type_*` in `apps/website/messages/en.json`. The control's own
 * label is `trades_filter_type_label`, which is **"Event"**, not "Type" — the
 * website already spends "Type" (`filter_type`) on the digital / physical
 * filter, which the lab's long-tail popover carries too. Two controls under
 * one word in one Filters sheet is the collision that naming avoids.
 */
export const TRANSFER_TYPE_LABEL: Record<TransferType, string> = {
  all: "All",
  mint: "Mint",
  received: "Received",
  sent: "Sent",
  spin: "Spin",
};

export const EDITIONS = ["1st", "2nd", "3rd"] as const;
export type Edition = (typeof EDITIONS)[number];

export type OnOffline = LabObjekt["onOffline"];

export type Filters = {
  search: string;
  /** empty means "all artists in the global scope" */
  artist: string[];
  member: string[];
  season: string[];
  class: string[];
  /** raw collection numbers, e.g. `229Z` — the Collection combobox writes this */
  collectionNo: string[];
  transferable: boolean;
  edition: Edition | null;
  onOffline: OnOffline[];
  combine: boolean;
  hidePins: boolean;
  /**
   * Profile Collection only: `true` keeps locked objekts, `false` keeps
   * unlocked ones, `null` is "any". Like the website's `filters.locked` it
   * only speaks about owned tokens — a collection row has no lock — so a
   * surface with no locks of its own passes `NO_IDS` and the field is inert.
   */
  locked: boolean | null;
  /** Market only: hide listings without a floor price. Applied by the Market page, not `applyFilters`. */
  pricedOnly: boolean;
  /**
   * Objekt background colour to match, as `#rrggbb`. `null` is "any colour";
   * the ColorPicker never writes an empty string.
   */
  color: string | null;
  /**
   * How far from `color` still counts as a match, in CIE Delta-E. `null` means
   * the default, `DEFAULT_COLOR_SENSITIVITY` — the same encoding
   * `apps/website` uses, so the URL carries the number only when it has been
   * moved off the default.
   */
  colorSensitivity: number | null;
  /**
   * Profile Activity only: which kind of transfer to keep. Lives in the shared
   * store rather than beside the tab, for the same reason `pricedOnly` does —
   * `activeChips` and `reset` are what draw the chip row and the Clear all
   * button, and a control outside the store has neither.
   */
  transferType: TransferType;
  sort: Sort;
  /** descending when true; see `SORT_DEFAULT_DESC` */
  sortDesc: boolean;
  columns: Columns;
};

export const DEFAULT_FILTERS: Filters = {
  search: "",
  artist: [],
  member: [],
  season: [],
  class: [],
  collectionNo: [],
  transferable: false,
  edition: null,
  onOffline: [],
  combine: false,
  hidePins: false,
  locked: null,
  pricedOnly: false,
  color: null,
  colorSensitivity: null,
  transferType: "all",
  sort: "newest",
  sortDesc: true,
  columns: 8,
};

type FilterState = Filters & {
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
};

export const useFilters = create<FilterState>((set) => ({
  ...DEFAULT_FILTERS,
  set: (patch) => set(patch),
  reset: () => set(DEFAULT_FILTERS),
}));

/**
 * Two long-tail filters belong to one surface each — Market's "Priced only"
 * and the profile Collection tab's "Lock" — but they live in the one shared
 * store, so a surface that does not show the control has to drop it on the
 * way out. Otherwise the grid stays narrowed by a filter with no visible
 * cause and no chip the user can reach.
 *
 * Both toolbars declare which of the two they own; everything they do not
 * name goes back to its default.
 */
export function useSurfaceFilters({
  pricedOnly = false,
  locked = false,
}: {
  pricedOnly?: boolean;
  locked?: boolean;
}): void {
  const f = useFilters();
  useEffect(() => {
    if (!pricedOnly && f.pricedOnly) f.set({ pricedOnly: false });
    if (!locked && f.locked !== null) f.set({ locked: null });
  }, [pricedOnly, locked, f]);
}

/** Serial-derived fake edition: fixtures have no edition field. */
export function editionOf(serial: number): Edition {
  if (serial <= 1000) return "1st";
  if (serial <= 2000) return "2nd";
  return "3rd";
}

export type GridObjekt = { objekt: LabObjekt; qty: number };

/** `applyFilters`' `pinned` / `locked` argument for a surface that has neither */
export const NO_IDS: ReadonlySet<string> = new Set();

/** the Delta-E a colour filter uses until the Sensitivity slider is moved */
export const DEFAULT_COLOR_SENSITIVITY = 7;

/** the slider's ends; 1 is "this exact swatch", 20 is "this family of hues" */
export const COLOR_SENSITIVITY_RANGE = { min: 1, max: 20 } as const;

/**
 * `chroma()` is the expensive half of the colour filter — it runs once per row
 * per keystroke of the picker — and the fixtures only carry 57 distinct
 * background colours, so every parse is memoised on its own hex string.
 * `null` marks a string chroma could not read, which is cached too: an
 * unparseable value must not be re-parsed 180 times a frame.
 */
const parsedColors = new Map<string, Color | null>();

function parseColor(hex: string): Color | null {
  let hit = parsedColors.get(hex);
  if (hit === undefined) {
    try {
      hit = chroma(hex);
    } catch {
      hit = null;
    }
    parsedColors.set(hex, hit);
  }
  return hit;
}

/**
 * The facet half of `applyFilters`: the global artist scope, the five facet
 * dropdowns and the colour match, and nothing token-level. Progress measures
 * the collection catalogue, whose rows carry no serial, no price and no search
 * text, so it needs exactly this much of the pipeline — and needs it to be the
 * same code, or the toolbar's facets and the progress totals drift apart.
 *
 * Colour belongs here rather than in `applyFilters` for the same reason the
 * website applies it inside `filterObjekts`: a collection row has a
 * `backgroundColor`, so Progress and Statistics narrow with the grid.
 */
export function matchesFacets(o: LabObjekt, f: Filters, scope: readonly LabArtist[]): boolean {
  if (!scope.includes(o.artist)) return false;
  if (f.artist.length && !f.artist.includes(o.artist)) return false;
  if (f.member.length && !f.member.includes(o.member)) return false;
  if (f.season.length && !f.season.includes(o.season)) return false;
  if (f.class.length && !f.class.includes(o.class)) return false;
  if (f.collectionNo.length && !f.collectionNo.includes(o.collectionNo)) return false;
  if (f.color) {
    const target = parseColor(f.color);
    const swatch = parseColor(o.backgroundColor.trim());
    // a hex neither side can read leaves the row alone rather than hiding it,
    // which is what the website's try/catch does
    if (target && swatch) {
      const limit = f.colorSensitivity ?? DEFAULT_COLOR_SENSITIVITY;
      if (chroma.deltaE(target, swatch) > limit) return false;
    }
  }
  return true;
}

/**
 * `scope` is the globally selected artists (the nav control). It is a setting,
 * not a filter: a row outside it never shows, whatever `f.artist` says.
 */
export function applyFilters(
  source: LabObjekt[],
  f: Filters,
  pinned: ReadonlySet<string>,
  locked: ReadonlySet<string>,
  scope: readonly LabArtist[],
): GridObjekt[] {
  const q = f.search.trim().toLowerCase();
  const rows = source.filter((o) => {
    if (!matchesFacets(o, f, scope)) return false;
    // transferable / edition are token-level; a collection row has no opinion
    if (f.transferable && o.transferable === false) return false;
    if (f.edition && o.serial !== undefined && editionOf(o.serial) !== f.edition) return false;
    if (f.onOffline.length && !f.onOffline.includes(o.onOffline)) return false;
    if (f.hidePins && pinned.has(o.id)) return false;
    // `isObjektOwned(a) && (a.isLocked ?? false) !== filters.locked` in the
    // website's `filter-utils.ts`: a row with no serial is not owned, so the
    // lock filter cannot have an opinion about it
    if (f.locked !== null && o.serial !== undefined && locked.has(o.id) !== f.locked) return false;
    if (q) {
      const hay =
        `${o.member} ${o.collectionNo} ${o.serial ?? ""} ${o.season} ${o.class}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // group before sorting: the "Duplicate" sort orders by the grouped count,
  // which does not exist until the rows have been combined
  let grid: GridObjekt[];
  if (f.combine) {
    const byCollection = new Map<string, GridObjekt>();
    for (const objekt of rows) {
      const hit = byCollection.get(objekt.collectionId);
      if (hit) hit.qty += 1;
      else byCollection.set(objekt.collectionId, { objekt, qty: 1 });
    }
    grid = [...byCollection.values()];
  } else {
    grid = rows.map((objekt) => ({ objekt, qty: 1 }));
  }

  // every comparator is written ascending; `sortDesc` flips it
  const ascending = (a: GridObjekt, b: GridObjekt): number => {
    switch (f.sort) {
      case "serial":
        return (a.objekt.serial ?? 0) - (b.objekt.serial ?? 0);
      case "member":
        return (
          a.objekt.member.localeCompare(b.objekt.member) ||
          a.objekt.collectionNo.localeCompare(b.objekt.collectionNo)
        );
      case "season":
        return (
          a.objekt.season.localeCompare(b.objekt.season) ||
          a.objekt.collectionNo.localeCompare(b.objekt.collectionNo)
        );
      case "collectionNo":
        return a.objekt.collectionNo.localeCompare(b.objekt.collectionNo);
      case "duplicate":
        return a.qty - b.qty || a.objekt.collectionNo.localeCompare(b.objekt.collectionNo);
      case "received":
        return (
          (a.objekt.receivedAt?.getTime() ?? 0) - (b.objekt.receivedAt?.getTime() ?? 0) ||
          a.objekt.collectionNo.localeCompare(b.objekt.collectionNo)
        );
      default:
        return a.objekt.createdAt.localeCompare(b.objekt.createdAt);
    }
  };

  return grid.sort((a, b) => (f.sortDesc ? -ascending(a, b) : ascending(a, b)));
}

/** Derive the removable chips from active (non-default) filters. */
export type Chip = { key: string; label: string; remove: Partial<Filters> };

export function activeChips(f: Filters): Chip[] {
  const chips: Chip[] = [];
  const multi = (key: "artist" | "member" | "season" | "class" | "collectionNo", label: string) => {
    for (const v of f[key]) {
      chips.push({
        key: `${key}:${v}`,
        label: `${label}: ${v}`,
        remove: { [key]: f[key].filter((x) => x !== v) },
      });
    }
  };
  // the artist segment is a plain filter like any other: removing its chip, or
  // Clear all, is the only way the row can claim to show every active filter
  multi("artist", "Artist");
  multi("member", "Member");
  multi("season", "Season");
  multi("class", "Class");
  multi("collectionNo", "Collection");
  if (f.transferable)
    chips.push({ key: "transferable", label: "Transferable", remove: { transferable: false } });
  if (f.edition)
    chips.push({ key: "edition", label: `Edition: ${f.edition}`, remove: { edition: null } });
  for (const v of f.onOffline) {
    chips.push({
      key: `type:${v}`,
      label: `Type: ${v === "online" ? "Digital" : "Physical"}`,
      remove: { onOffline: f.onOffline.filter((x) => x !== v) },
    });
  }
  if (f.combine)
    chips.push({ key: "combine", label: "Duplicates combined", remove: { combine: false } });
  if (f.hidePins)
    chips.push({ key: "hidePins", label: "Pins hidden", remove: { hidePins: false } });
  if (f.locked !== null)
    chips.push({
      key: "locked",
      label: f.locked ? "Locked" : "Unlocked",
      remove: { locked: null },
    });
  if (f.pricedOnly)
    chips.push({ key: "pricedOnly", label: "Priced only", remove: { pricedOnly: false } });
  // the sensitivity has no meaning without a colour, so one chip drops both
  if (f.color)
    chips.push({
      key: `color:${f.color}`,
      label: `Colour: ${f.color}`,
      remove: { color: null, colorSensitivity: null },
    });
  if (f.transferType !== "all")
    chips.push({
      key: `transferType:${f.transferType}`,
      label: `Event: ${TRANSFER_TYPE_LABEL[f.transferType]}`,
      remove: { transferType: "all" },
    });
  return chips;
}

/** Count shown on the "Filters" button: long-tail filters only. */
export function longTailCount(f: Filters): number {
  return (
    Number(f.transferable) +
    Number(f.edition !== null) +
    Number(f.onOffline.length > 0) +
    Number(f.combine) +
    Number(f.hidePins) +
    Number(f.locked !== null) +
    Number(f.pricedOnly) +
    Number(f.color !== null)
  );
}
