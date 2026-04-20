import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { groupBy } from "es-toolkit";
import { useDeferredValue, useMemo } from "react";

import { filterObjekts } from "@/lib/filter-utils";
import { orpc } from "@/lib/orpc/client";
import { collectionOptions } from "@/lib/query-options";

import { useCollectionRarity } from "./use-collection-rarity";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollections } from "./use-owned-collections";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useProfileObjekts() {
  const shape = useShapeObjekts();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();
  const deferredFilters = useDeferredValue(filters);
  const rarityMap = useCollectionRarity();

  const serverFilters = {
    artist: selectedArtistIds,
    at: filters.at ?? undefined,
  };

  const { objekts: allOwnedObjekts, hasNextPage } = useOwnedCollections(
    profile.address,
    serverFilters,
  );

  const [pinsQuery, lockedObjektQuery] = useSuspenseQueries({
    queries: [
      orpc.pins.list.queryOptions({
        input: profile.address,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
        select: (data) => new Map(data.map((p) => [p.tokenId, p.order])),
      }),
      orpc.lockedObjekt.list.queryOptions({
        input: profile.address,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5,
        select: (data) => new Set(data.map((l) => l.tokenId)),
      }),
    ],
  });

  const objektsQuery = useQuery(collectionOptions(serverFilters, !hasNextPage));

  const result = useMemo(() => {
    // augment owned objekts with pin/lock status
    const pinsMap = pinsQuery.data;
    const lockedSet = lockedObjektQuery.data;

    const ownedWithPinLock = deferredFilters.at
      ? allOwnedObjekts
      : allOwnedObjekts.map((objekt) => {
          const isPin = pinsMap.has(objekt.id);
          const isLocked = lockedSet.has(objekt.id);
          return Object.assign(objekt, {
            isPin,
            isLocked,
            pinOrder: isPin ? pinsMap.get(objekt.id)! : null,
          });
        });

    const ownedFiltered = filterObjekts(deferredFilters, ownedWithPinLock);

    // find missing objekts based on owned slug
    const ownedSlugs = new Set(ownedFiltered.map((obj) => obj.slug));
    const missingObjekts =
      deferredFilters.unowned || deferredFilters.missing
        ? (objektsQuery.data ?? []).filter((obj) => !ownedSlugs.has(obj.slug))
        : [];
    const missingFiltered = filterObjekts(deferredFilters, missingObjekts);

    // combine both
    const filtered = [...ownedFiltered, ...missingFiltered];

    return {
      shaped: shape(filtered, deferredFilters, true, rarityMap),
      filtered,
      grouped: Object.values(groupBy(filtered, (a) => a.collectionId)),
      filters: deferredFilters,
      hasNextPage,
      isStale: filters !== deferredFilters,
    };
  }, [
    shape,
    deferredFilters,
    allOwnedObjekts,
    pinsQuery.data,
    lockedObjektQuery.data,
    objektsQuery.data,
    hasNextPage,
    filters,
    rarityMap,
  ]);

  return result;
}
