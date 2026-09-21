import { useMemo } from "react";

import { type LabArtist, type LabObjekt, objekts } from "@/fixtures/objekts";
import { scopeArtists, useArtists } from "@/store/artists";

export type Facets = {
  artists: readonly string[];
  members: readonly string[];
  seasons: readonly string[];
  classes: readonly string[];
  /** raw collection numbers, deduplicated — one `229Z`, whatever seasons carry it */
  collectionNos: readonly string[];
};

const uniq = (xs: string[]) => [...new Set(xs)].sort();

/**
 * The eight background colours the catalogue uses most, as the colour
 * picker's preset row. Computed once from the fixtures rather than written
 * down, so a refreshed `collections.json` re-ranks them instead of leaving a
 * swatch that matches nothing. Ties break on the hex so the row is stable.
 */
export const COLOR_SWATCHES: readonly string[] = (() => {
  const tally = new Map<string, number>();
  for (const o of objekts) {
    const hex = o.backgroundColor.trim().toLowerCase();
    if (hex) tally.set(hex, (tally.get(hex) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([hex]) => hex);
})();

export function facetsOf(rows: readonly LabObjekt[]): Facets {
  return {
    artists: uniq(rows.map((o) => o.artist)),
    members: uniq(rows.map((o) => o.member)),
    seasons: uniq(rows.map((o) => o.season)),
    classes: uniq(rows.map((o) => o.class)),
    collectionNos: uniq(rows.map((o) => o.collectionNo)),
  };
}

/** members of each globally selected artist, in artist order */
export type MemberGroup = { artist: LabArtist; members: string[] };

/**
 * Every filter dropdown offers only what the globally selected artists can
 * produce, so a facet can never select rows the scope already hid.
 */
export function useScopedFacets(source: readonly LabObjekt[] = objekts): {
  facets: Facets;
  groups: MemberGroup[];
  scope: LabArtist[];
} {
  const scope = useArtists((s) => s.selected);

  return useMemo(() => {
    const rows = scopeArtists(source, scope);
    const byArtist = new Map<LabArtist, string[]>(scope.map((artist) => [artist, []]));
    for (const row of rows) {
      const list = byArtist.get(row.artist);
      // the chip row is sized for sixteen members per artist, like the mockup
      if (list && !list.includes(row.member) && list.length < 16) list.push(row.member);
    }
    return {
      facets: facetsOf(rows),
      groups: scope.map((artist) => ({ artist, members: byArtist.get(artist) ?? [] })),
      scope,
    };
  }, [source, scope]);
}
