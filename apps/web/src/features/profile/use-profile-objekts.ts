import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import { Addresses } from "@repo/lib";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { filterObjekts } from "@/features/filters/filter-utils";
import type { FilterSearch } from "@/features/filters/search-schema";
import { useCanonicalFilters, useValidatedCanonicalFilters } from "@/features/filters/use-filters";
import { copiesIn } from "@/features/objekt/objekt-utils";
import { collectionOptions } from "@/features/objekt/queries";
import { useCollectionRarity } from "@/features/objekt/use-collection-rarity";

import { useProfileTarget } from "./profile-provider";
import {
  heldCollectionsOptions,
  locksOptions,
  ownedCollectionOptions,
  pinsOptions,
} from "./queries";

const NO_PINS: ReadonlyMap<string, number> = new Map();
const NO_LOCKS: ReadonlySet<string> = new Set();

function usePinsAndLocks(address: string) {
  const [pins, locks] = useQueries({ queries: [pinsOptions(address), locksOptions(address)] });
  return { pins: pins.data ?? NO_PINS, locks: locks.data ?? NO_LOCKS };
}

export function isSpinAddress(address: string): boolean {
  return address.toLowerCase() === Addresses.SPIN;
}

function ownedServerFilters(artist: OwnedBySchema["artist"], filters: FilterSearch): OwnedBySchema {
  return { artist, at: filters.at };
}

/**
 * Filters, sorts and the missing set are computed in the browser, so every
 * page is fetched up front rather than on scroll. Spin holds millions of
 * tokens, so it loads one counted row per collection instead.
 */
function useOwnedPages(address: string, filters: OwnedBySchema) {
  const spin = isSpinAddress(address);
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address, filters), enabled: !spin });
  const held = useQuery({ ...heldCollectionsOptions(address, filters.artist), enabled: spin });
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = query;

  // the profile header and the open tab both observe this query, so both run
  // this effect in the same commit; without `cancelRefetch: false` the second
  // call aborts the first and every page is requested twice
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const pages = query.data?.pages;
  const objekts = useMemo(
    () => (spin ? (held.data ?? []) : (pages?.flatMap((page) => page.objekts) ?? [])),
    [spin, held.data, pages],
  );
  return {
    objekts,
    isPending: spin ? held.isPending : query.isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

/** Spin is counted from today's holdings alone, so a checkpoint in its URL is dropped. */
function useProfileFilters(address: string, filters: FilterSearch): FilterSearch {
  return useMemo(
    () =>
      isSpinAddress(address) && filters.at !== undefined
        ? Object.assign({}, filters, { at: undefined })
        : filters,
    [address, filters],
  );
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
  const filters = useProfileFilters(profile.address, useCanonicalFilters());
  const deferredFilters = useDeferredValue(filters);

  const serverFilters = ownedServerFilters(selectedArtistIds, filters);
  const { objekts, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useOwnedPages(
    profile.address,
    serverFilters,
  );
  const { pins, locks } = usePinsAndLocks(profile.address);
  const { rarityMap, isLoading: rarityLoading } = useCollectionRarity();
  // the catalogue is only worth fetching once every owned page is in, or the
  // missing set would be measured against a partial collection
  const collections = useQuery({
    ...collectionOptions({ artist: selectedArtistIds, at: filters.at }),
    enabled: !hasNextPage,
  });

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
    rarityMap,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending: isPending || rarityLoading,
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
  // the tabs' own filters, so the header joins the query the grid fetched
  const filters = useProfileFilters(profile.address, useValidatedCanonicalFilters());

  const { objekts, isPending, hasNextPage } = useOwnedPages(
    profile.address,
    ownedServerFilters(selectedArtistIds, filters),
  );
  const { pins, locks } = usePinsAndLocks(profile.address);

  const counts = useMemo(
    () => ({
      owned: copiesIn(objekts),
      collections: new Set(objekts.map((objekt) => objekt.collectionId)).size,
    }),
    [objekts],
  );

  return {
    ...counts,
    partial: hasNextPage,
    isPending,
    pins: pins.size,
    locks: locks.size,
  };
}

/** Owned objekts and the catalogue behind them, for Progress and Statistics. */
export function useProfileCatalogue() {
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useProfileFilters(profile.address, useCanonicalFilters());
  const deferredFilters = useDeferredValue(filters);

  const serverFilters = ownedServerFilters(selectedArtistIds, filters);
  const { objekts, isPending, hasNextPage } = useOwnedPages(profile.address, serverFilters);
  const collections = useQuery({
    ...collectionOptions({ artist: selectedArtistIds, at: filters.at }),
    enabled: !hasNextPage,
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
    isPending: isPending || collections.isPending,
  };
}
