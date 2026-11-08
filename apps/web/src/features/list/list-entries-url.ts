import type { ValidArtist } from "@repo/cosmo/types/common";

/**
 * A list's entries URL, built once for the query and for the list routes' `<link rel="preload">`,
 * which the browser reuses only when the two URLs match exactly.
 */
export function listEntriesUrl(slug: string, artist: ValidArtist[]) {
  const params = new URLSearchParams();
  for (const a of artist) params.append("artist", a);
  const query = params.size > 0 ? `?${params}` : "";
  return `/api/v1/lists/${encodeURIComponent(slug)}/entries${query}`;
}
