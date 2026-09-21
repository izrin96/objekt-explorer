import type { LabArtist } from "@/fixtures/objekts";

/**
 * The real Cosmo artist logos. The website reads `logoImageUrl` off the Cosmo
 * artist API (`packages/cosmo/src/types/artists.ts`); the lab has no Cosmo
 * token, so the three URLs are pinned here — they are the ones objekt.top
 * preloads in its document head.
 *
 * All three are white marks on a dark plate (idntt's is a dark disc on a
 * transparent square), so they read on either theme inside a round avatar.
 */
export const ARTIST_LOGO: Record<LabArtist, string> = {
  tripleS: "https://static.cosmo.fans/assets/triples-logo.png",
  ARTMS: "https://static.cosmo.fans/assets/artms-logo.png",
  idntt: "https://static.cosmo.fans/assets/idntt-logo.png",
};

/** fallback plate behind a logo that has not loaded yet */
export const ARTIST_COLOR: Record<LabArtist, string> = {
  tripleS: "#e34d8c",
  ARTMS: "#4c62e6",
  idntt: "#3fb15a",
};

/**
 * The filter store holds `artist` as `string[]` and the chip row keys a chip
 * `artist:<name>`, so both records need a narrowing before they can be
 * indexed. Derived from `ARTIST_LOGO` rather than repeating the three names,
 * so a fourth artist cannot be added to one and missed by the other.
 */
export function isLabArtist(name: string): name is LabArtist {
  return Object.hasOwn(ARTIST_LOGO, name);
}
