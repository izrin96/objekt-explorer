import type { OwnedByFilters } from "@repo/api/schemas/objekts";
import { Addresses } from "@repo/lib";
import type { GridObjekt, PinState } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef } from "react";

import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { filterObjekts } from "@/features/filters/filter-utils";
import type { FilterSearch } from "@/features/filters/search-schema";
import { useCanonicalFilters, useValidatedCanonicalFilters } from "@/features/filters/use-filters";
import { copiesIn, isObjektOwned } from "@/features/objekt/objekt-utils";
import { collectionOptions } from "@/features/objekt/queries";
import { useCollectionRarity } from "@/features/objekt/use-collection-rarity";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";

import { joinOwnedPages } from "./owned-join";
import { heldCollectionsOptions, locksOptions, ownedCopiesOptions, pinsOptions } from "./queries";
import { useProfile } from "./use-profile";

const NO_PINS: ReadonlyMap<string, number> = new Map();
const NO_LOCKS: ReadonlySet<string> = new Set();

function usePinsAndLocks(address: string) {
  const [pins, locks] = useQueries({ queries: [pinsOptions(address), locksOptions(address)] });
  return { pins: pins.data ?? NO_PINS, locks: locks.data ?? NO_LOCKS };
}

export function isSpinAddress(address: string): boolean {
  return address.toLowerCase() === Addresses.SPIN;
}

function ownedServerFilters(
  artist: OwnedByFilters["artist"],
  filters: FilterSearch,
): OwnedByFilters {
  return { artist, at: filters.at };
}

/**
 * Filters, sorts and the missing set are computed in the browser, so every
 * page is fetched up front rather than on scroll. Spin holds millions of
 * tokens, so it loads one counted row per collection instead. The copies carry
 * no collection fields: they join the collection list, fetched beside them.
 */
function useOwnedPages(address: string, filters: OwnedByFilters) {
  const spin = isSpinAddress(address);
  const query = useInfiniteQuery({ ...ownedCopiesOptions(address, filters), enabled: !spin });
  const held = useQuery({ ...heldCollectionsOptions(address, filters.artist), enabled: spin });
  const catalogue = useQuery(collectionOptions({ artist: filters.artist, at: filters.at }));
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  // the profile header and the open tab both observe this query, so both page it in one commit
  useLoadAllPages(!spin, query);

  const pages = query.data?.pages;
  const joined = useMemo(() => {
    if (spin) return { objekts: held.data ?? [], missing: NO_SLUGS };
    if (!pages || !catalogue.data) return { objekts: [], missing: NO_SLUGS };
    return joinOwnedPages(pages, catalogue.data);
  }, [spin, held.data, pages, catalogue.data]);
  useCatalogueCatchUp(joined.missing, catalogue);

  return {
    objekts: joined.objekts as GridObjekt[],
    catalogue,
    isPending: spin ? held.isPending : query.isPending || catalogue.isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

const NO_SLUGS: string[] = [];

/**
 * The collection list is cached for good, so a copy of a collection made since it loaded finds
 * no match; that list is fetched again once (a 304 when nothing changed) per set of misses.
 */
function useCatalogueCatchUp(
  missing: string[],
  { isFetching, refetch }: { isFetching: boolean; refetch: () => Promise<unknown> },
) {
  const asked = useRef<string | null>(null);
  const key = missing.join(",");
  useEffect(() => {
    if (key === "" || isFetching || asked.current === key) return;
    asked.current = key;
    void refetch();
  }, [key, isFetching, refetch]);
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
 * What both profile views read: the tabs' filters (deferred), every owned page,
 * and the catalogue behind them.
 */
function useProfileSources() {
  const profile = useProfile();
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useProfileFilters(profile.address, useCanonicalFilters());
  const deferredFilters = useDeferredValue(filters);

  const serverFilters = ownedServerFilters(selectedArtistIds, filters);
  const owned = useOwnedPages(profile.address, serverFilters);
  return { profile, deferredFilters, owned, collections: owned.catalogue };
}

/**
 * Owned objekts for the profile in context, merged with its pins and locks.
 *
 * A checkpoint (`filters.at`) asks the server for a past state, which carries
 * no pin or lock of its own, so the merge is skipped rather than painting
 * today's marks onto yesterday's collection.
 */
export function useProfileObjekts() {
  const { profile, deferredFilters, owned: ownedPages, collections } = useProfileSources();
  const { objekts, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = ownedPages;
  const { pins, locks } = usePinsAndLocks(profile.address);
  const { rarityMap, isLoading: rarityLoading } = useCollectionRarity();

  // apart from the filters, so a filter change doesn't copy every objekt again
  const pastState = Boolean(deferredFilters.at);
  const withMarks = useMemo(
    () =>
      pastState
        ? objekts
        : objekts.map((objekt) => {
            if (!isObjektOwned(objekt)) return objekt;
            const pinOrder = pins.get(objekt.tokenId);
            return Object.assign({}, objekt, {
              isPin: pinOrder !== undefined,
              isLocked: locks.has(objekt.tokenId),
              pinOrder: pinOrder ?? null,
            } satisfies PinState);
          }),
    [pastState, objekts, pins, locks],
  );

  const derived = useMemo(() => {
    const owned = filterObjekts(deferredFilters, withMarks);
    const ownedSlugs = new Set(owned.map((objekt) => objekt.slug));
    // measured against every owned page, or a copy still loading would read as missing
    const missing =
      !hasNextPage && (deferredFilters.unowned || deferredFilters.missing)
        ? filterObjekts(
            deferredFilters,
            (collections.data ?? []).filter((objekt) => !ownedSlugs.has(objekt.slug)),
          )
        : [];

    const filtered: GridObjekt[] = [...owned, ...missing];
    return { filtered, ownedSlugs, allOwned: withMarks };
  }, [deferredFilters, withMarks, collections.data, hasNextPage]);

  return {
    ...derived,
    catalogue: hasNextPage ? undefined : collections.data,
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
  const profile = useProfile();
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
  const { deferredFilters, owned: ownedPages, collections } = useProfileSources();
  const { objekts, isPending, hasNextPage } = ownedPages;

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
    // progress and statistics count against every owned page
    isPending: isPending || collections.isPending || hasNextPage,
  };
}
