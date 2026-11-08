import type { OwnedByFilters } from "@repo/api/schemas/objekts";

/**
 * The first owned-copies page's URL, built once for the query and for the profile layout's `<link
 * rel="preload">`, which the browser reuses only when the two URLs match exactly. Later pages carry a
 * cursor and go through RPC.
 */
export function ownedCopiesUrl(address: string, filters?: Pick<OwnedByFilters, "artist" | "at">) {
  const params = new URLSearchParams();
  for (const artist of filters?.artist ?? []) params.append("artist", artist);
  if (filters?.at) params.set("at", filters.at);
  const query = params.size > 0 ? `?${params}` : "";
  return `/api/v1/objekts/owned-copies/${encodeURIComponent(address)}${query}`;
}
