import type { OwnedByFilters } from "@repo/api/schemas/objekts";

/**
 * The collection list's URL, built once for the query and for the home page's `<link
 * rel="preload">`, which the browser reuses only when the two URLs match exactly. The drawer
 * reads the Cosmo URLs from the collection's metadata, so the list leaves them out.
 */
export function collectionsUrl(filters?: OwnedByFilters) {
  const params = new URLSearchParams();
  for (const artist of filters?.artist ?? []) params.append("artist", artist);
  if (filters?.at) params.set("at", filters.at);
  params.set("originals", "false");
  // see `ids` on `collectionListInputSchema`
  params.set("ids", "false");
  return `/api/v1/collections?${params}`;
}
