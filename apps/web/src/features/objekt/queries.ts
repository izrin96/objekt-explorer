import type { SortBy, SortDir } from "@repo/api/schemas/market";
import type {
  CollectionMetadata,
  CollectionResult,
  ObjektTransferResult,
} from "@repo/api/schemas/objekt";
import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { orpc } from "@/lib/orpc";

import { mapObjektWithTag } from "./objekt-utils";

export type SerialList = { serials: number[] };

/** Never changes under a given artist scope, so it is fetched once and filtered in the browser. */
export const collectionOptions = (filters?: OwnedBySchema) =>
  queryOptions({
    queryKey: ["collections", filters],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const result = await ofetch<CollectionResult>("/api/collection", {
        query: { ...filters },
      }).then((response) => response.collections);

      return result.map(mapObjektWithTag);
    },
    throwOnError: true,
  });

export const collectionMetadataOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "metadata", slug],
    queryFn: () => ofetch<CollectionMetadata>(`/api/objekts/metadata/${slug}`),
    staleTime: 1000 * 60,
  });

export const serialListOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "list", slug],
    queryFn: () => ofetch<SerialList>(`/api/objekts/list/${slug}`).then((a) => a.serials),
    staleTime: 1000 * 60,
  });

export const transfersOptions = (slug: string, serial: number | null) =>
  queryOptions({
    queryKey: ["objekts", "transfers", slug, serial],
    queryFn: () => ofetch<ObjektTransferResult>(`/api/objekts/transfers/${slug}/${serial}`),
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

export const marketStatsOptions = (slug: string) =>
  orpc.market.stats.queryOptions({
    input: { collectionSlug: slug },
    staleTime: 1000 * 60,
  });
