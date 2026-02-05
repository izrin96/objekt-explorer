import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue } from "react";

import { augmentObjektsWithPinLock } from "@/lib/objekt-utils";
import { orpc } from "@/lib/orpc/client";
import { collectionOptions } from "@/lib/query-options";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useOwnedCollections } from "./use-owned-collections";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useProfileObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    selectedArtistIds,
    filters.at ?? undefined,
  );

  const [pinsQuery, lockedObjektQuery] = useSuspenseQueries({
    queries: [
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

  const objektsQuery = useQuery(collectionOptions(selectedArtistIds, !hasNextPage));

  // owned objekts - in checkpoint mode, skip pin/lock augmentation
  const ownedWithPinLock = filters.at
    ? allOwnedObjekts
    : augmentObjektsWithPinLock(allOwnedObjekts, pinsQuery.data, lockedObjektQuery.data);

  const ownedFiltered = filter(ownedWithPinLock);

  // find missing objekts based on owned slug
  const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
  const missingObjekts =
    filters.unowned || filters.missing
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
    hasNextPage,
  });
}
