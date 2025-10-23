import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue } from "react";
import { mapObjektWithPinLock } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";
import { collectionOptions, ownedCollectionOptions } from "@/lib/query-options";
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
      ownedCollectionOptions(profile.address, selectedArtistIds),
      orpc.pins.list.queryOptions({
        input: profile.address,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
      }),
      orpc.lockedObjekt.list.queryOptions({
        input: profile.address,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
      }),
    ],
  });

  const objektsQuery = useQuery({
    ...collectionOptions(selectedArtistIds),
    enabled: filters.unowned ?? false,
  });

  // owned objekts
  const ownedFiltered = filter(ownedQuery.data).map((a) =>
    mapObjektWithPinLock(a, pinsQuery.data, lockedObjektQuery.data),
  );

  // find missing objekts based on owned slug
  const ownedSlugs = new Set(ownedQuery.data.map((obj) => obj.slug));
  const missingObjekts = filters.unowned
    ? (objektsQuery.data ?? []).filter((obj) => !ownedSlugs.has(obj.slug))
    : [];
  const missingFiltered = filter(missingObjekts);

  // combine both
  const filtered = [...ownedFiltered, ...missingFiltered];

  return useDeferredValue({
    shaped: shape(filtered, true),
    filtered,
    grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
    filters,
  });
}
