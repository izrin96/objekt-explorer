import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { filterObjekts } from "@/features/filters/filter-utils";
import { useCanonicalFilters, useFilters } from "@/features/filters/use-filters";
import { collectionOptions } from "@/features/objekt/queries";

import { useProfileTarget } from "./profile-provider";
import { locksOptions, ownedCollectionOptions, pinsOptions, rarityOptions } from "./queries";

const NO_PINS: ReadonlyMap<string, number> = new Map();
const NO_LOCKS: ReadonlySet<string> = new Set();

function usePinsAndLocks(address: string) {
  const [pins, locks] = useQueries({ queries: [pinsOptions(address), locksOptions(address)] });
  return { pins: pins.data ?? NO_PINS, locks: locks.data ?? NO_LOCKS };
}

function useOwnedPages(address: string, filters: OwnedBySchema) {
  const query = useInfiniteQuery(ownedCollectionOptions(address, filters));
  const objekts = useMemo(
    () => query.data?.pages.flatMap((page) => page.objekts) ?? [],
    [query.data],
  );
  return { query, objekts };
}

/**
 * Owned objekts for the profile in context, merged with its pins and locks.
 *
 * A checkpoint (`filters.at`) asks the server for a past state, which carries
 * no pin or lock of its own, so the merge is skipped rather than painting
 * today's marks onto yesterday's collection.
 */
export function useProfileObjekts() {
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const deferredFilters = useDeferredValue(filters);

  const serverFilters: OwnedBySchema = { artist: selectedArtistIds, at: filters.at };
  const { query, objekts } = useOwnedPages(profile.address, serverFilters);
  const { pins, locks } = usePinsAndLocks(profile.address);
  const rarity = useQuery(rarityOptions(filters.sort === "rare"));
  // the catalogue is only worth fetching once every owned page is in, or the
  // missing set would be measured against a partial collection
  const collections = useQuery({
    ...collectionOptions(serverFilters),
    enabled: !query.hasNextPage,
  });

  const { fetchNextPage } = query;

  const derived = useMemo(() => {
    const withMarks: ValidObjekt[] = deferredFilters.at
      ? objekts
      : objekts.map((objekt) => {
          const isPin = pins.has(objekt.id);
          return Object.assign({}, objekt, {
            isPin,
            isLocked: locks.has(objekt.id),
            pinOrder: isPin ? (pins.get(objekt.id) ?? null) : null,
          } satisfies Pick<OwnedObjekt, "isPin" | "isLocked" | "pinOrder">);
        });

    const owned = filterObjekts(deferredFilters, withMarks);
    const ownedSlugs = new Set(owned.map((objekt) => objekt.slug));
    const missing =
      deferredFilters.unowned || deferredFilters.missing
        ? filterObjekts(
            deferredFilters,
            (collections.data ?? []).filter((objekt) => !ownedSlugs.has(objekt.slug)),
          )
        : [];

    return { filtered: [...owned, ...missing], ownedSlugs };
  }, [deferredFilters, objekts, pins, locks, collections.data]);

  return {
    ...derived,
    filters: deferredFilters,
    rarityMap: rarity.data,
    status: query.status,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage,
    isPending: query.isPending,
  };
}

/**
 * The counts above the tabs. It joins the same owned query the Collection,
 * Progress and Statistics tabs run, so the tabs cost one fetch between them;
 * the owned count carries a `+` while pages remain, because the route pages by
 * cursor and never counts the whole set.
 */
export function useProfileSummary() {
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const at = useFilters((f) => f.at);

  const { query, objekts } = useOwnedPages(profile.address, { artist: selectedArtistIds, at });
  const { pins, locks } = usePinsAndLocks(profile.address);

  const counts = useMemo(
    () => ({
      owned: objekts.length,
      collections: new Set(objekts.map((objekt) => objekt.collectionId)).size,
    }),
    [objekts],
  );

  return {
    ...counts,
    partial: query.hasNextPage,
    isPending: query.isPending,
    pins: pins.size,
    locks: locks.size,
  };
}

/** Owned objekts and the catalogue behind them, for Progress and Statistics. */
export function useProfileCatalogue() {
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const deferredFilters = useDeferredValue(filters);

  const serverFilters: OwnedBySchema = { artist: selectedArtistIds, at: filters.at };
  const { query, objekts } = useOwnedPages(profile.address, serverFilters);
  const collections = useQuery({
    ...collectionOptions(serverFilters),
    enabled: !query.hasNextPage,
  });

  const derived = useMemo(
    () => ({
      owned: filterObjekts(deferredFilters, objekts),
      catalogue: filterObjekts(deferredFilters, collections.data ?? []),
    }),
    [deferredFilters, objekts, collections.data],
  );

  return {
    ...derived,
    filters: deferredFilters,
    isPending: query.isPending || collections.isPending,
  };
}
