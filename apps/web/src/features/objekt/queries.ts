import type { SlimCollectionListOutput } from "@repo/api/schemas/collections";
import type { SortBy, SortDir } from "@repo/api/schemas/market";
import type { OwnedByFilters } from "@repo/api/schemas/objekts";
import type { PriceHistoryRange } from "@repo/api/schemas/price-history";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { orpc } from "@/lib/orpc";

import { collectionsUrl } from "./collections-url";
import { mapObjektWithTag } from "./objekt-utils";

/** Rows of the slim list (asked without ids, `collectionsUrl`): the slug stands in, as the row's key only. */
export function toGridCollections(rows: SlimCollectionListOutput["collections"]) {
  return rows.map((collection) => mapObjektWithTag({ ...collection, id: collection.slug }));
}

/** the prefix of every artist scope's collection list */
export const COLLECTIONS_KEY = ["collections"] as const;

/** Never changes under a given artist scope, so it is fetched once and filtered in the browser. */
export const collectionOptions = (filters?: OwnedByFilters) =>
  queryOptions({
    queryKey: [...COLLECTIONS_KEY, filters],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // plain GET rather than RPC, so the browser revalidates its cached copy with Last-Modified
      const fetchCollections = (cache?: RequestCache) =>
        ofetch<SlimCollectionListOutput | undefined>(collectionsUrl(filters), { cache }).then(
          (response) => response?.collections,
        );

      // Safari can hand the server's empty 304 to fetch instead of its cached copy (WEB-1F)
      const result = (await fetchCollections()) ?? (await fetchCollections("no-store"));
      if (!result) throw new Error("Collections response had no body");

      return toGridCollections(result);
    },
    throwOnError: true,
  });

export const collectionMetadataOptions = (slug: string) =>
  orpc.collections.metadata.queryOptions({
    input: { collectionSlug: slug },
    staleTime: 1000 * 60,
  });

export const serialListOptions = (slug: string) =>
  orpc.collections.serials.queryOptions({
    input: { collectionSlug: slug },
    staleTime: 1000 * 60,
  });

export const transfersOptions = (slug: string, serial: number | null) =>
  orpc.collections.serialTransfers.queryOptions({
    input: { collectionSlug: slug, serial: serial ?? 0 },
    enabled: serial !== null && serial > 0,
    retry: 1,
    staleTime: 0,
  });

export const marketListingsOptions = (slug: string, sortBy: SortBy, sortDir: SortDir) =>
  orpc.market.listingsForViewer.infiniteOptions({
    input: (offset: number) => ({ collectionSlug: slug, sortBy, sortDir, offset, limit: 20 }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 1000 * 60,
    // keeps the rows on screen while a re-sort is in flight
    placeholderData: keepPreviousData,
  });

export const holdersOptions = (slug: string) =>
  orpc.collections.holders.infiniteOptions({
    input: (offset: number) => ({ collectionSlug: slug, offset, limit: offset === 0 ? 10 : 50 }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 1000 * 60,
  });

export const marketStatsOptions = (slug: string) =>
  orpc.market.stats.queryOptions({
    input: { collectionSlug: slug },
    staleTime: 1000 * 60,
  });

export const priceHistoryOptions = (slug: string, range: PriceHistoryRange) =>
  orpc.market.priceHistory.queryOptions({
    input: { collectionSlug: slug, range },
  });
