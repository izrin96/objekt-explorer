import { useQuery } from "@tanstack/react-query";

import { useFilters } from "@/features/filters/use-filters";
import { orpc } from "@/lib/orpc";

/** the server caches the map for two hours; a browser holding it for one is still fresh */
const RARITY_STALE_TIME = 1000 * 60 * 60;

const rarityOptions = (enabled: boolean) =>
  orpc.collections.rarity.queryOptions({
    staleTime: RARITY_STALE_TIME,
    enabled,
    select: (data) => new Map(data.map((row) => [row.slug, row.count])),
  });

/**
 * How many of each collection exist, which only the Rarity sort reads — and
 * which `sortObjekts` cannot order without, so a surface holds its loading
 * state on `isLoading` rather than painting an empty grid. `isLoading` and not
 * `isPending`: a disabled query is pending forever.
 */
export function useCollectionRarity(): {
  rarityMap: Map<string, number> | undefined;
  isLoading: boolean;
} {
  const sort = useFilters((f) => f.sort);
  const query = useQuery(rarityOptions(sort === "rare"));
  return { rarityMap: query.data, isLoading: query.isLoading };
}
