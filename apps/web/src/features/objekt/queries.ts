import type { CollectionListOutput } from "@repo/api/schemas/collections";
import type { SortBy, SortDir } from "@repo/api/schemas/market";
import type { OwnedByFilters } from "@repo/api/schemas/objekts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { client, orpc } from "@/lib/orpc";

import { mapObjektWithTag } from "./objekt-utils";

/** Never changes under a given artist scope, so it is fetched once and filtered in the browser. */
export const collectionOptions = (filters?: OwnedByFilters) =>
  queryOptions({
    queryKey: ["collections", filters],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // plain GET rather than RPC, so the browser revalidates its cached copy with Last-Modified
      const result = await ofetch<CollectionListOutput>("/api/v1/collections", {
        query: { ...filters },
      }).then((response) => response.collections);

      return result.map(mapObjektWithTag);
    },
    throwOnError: true,
  });

export const collectionMetadataOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "metadata", slug],
    queryFn: () => client.collections.metadata({ collectionSlug: slug }),
    staleTime: 1000 * 60,
  });

export const serialListOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "list", slug],
    queryFn: () => client.collections.serials({ collectionSlug: slug }),
    staleTime: 1000 * 60,
  });

export const transfersOptions = (slug: string, serial: number | null) =>
  queryOptions({
    queryKey: ["objekts", "transfers", slug, serial],
    queryFn: () =>
      client.collections.serialTransfers({ collectionSlug: slug, serial: serial ?? 0 }),
    enabled: serial !== null && serial > 0,
    retry: 1,
    staleTime: 0,
  });

export const marketListingsOptions = (slug: string, sortBy: SortBy, sortDir: SortDir) =>
  orpc.market.marketListings.infiniteOptions({
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
