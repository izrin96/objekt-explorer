import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";
import { mapObjektWithPinLock } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";
import { collectionQueryOptions, ownedCollectionQueryOptions } from "@/lib/query-options";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useProfileObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const [ownedQuery, pinsQuery, lockedObjektQuery] = useSuspenseQueries({
    queries: [
      ownedCollectionQueryOptions(profile.address, selectedArtistIds),
      orpc.pins.list.queryOptions({
        input: { address: profile.address },
        staleTime: Infinity,
      }),
      orpc.lockedObjekt.list.queryOptions({
        input: { address: profile.address },
        staleTime: Infinity,
      }),
    ],
  });

  const objektsQuery = useQuery({
    ...collectionQueryOptions(selectedArtistIds),
    enabled: filters.unowned ?? false,
  });

  const objekts = useMemo(() => {
    let combined: ValidObjekt[] = ownedQuery.data;
    if (filters.unowned) {
      const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
      const missingObjekts = (objektsQuery.data ?? []).filter((obj) => !ownedSlugs.has(obj.slug));
      combined = [...ownedQuery.data, ...missingObjekts];
    }
    return combined.map((a) => mapObjektWithPinLock(a, pinsQuery.data, lockedObjektQuery.data));
  }, [ownedQuery.data, objektsQuery.data, pinsQuery.data, lockedObjektQuery.data, filters.unowned]);

  const filtered = filter(objekts);

  return useDeferredValue({
    shaped: shape(filtered, true),
    filtered,
    grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
    filters,
  });
}
