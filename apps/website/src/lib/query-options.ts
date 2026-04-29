import type { CollectionResult, OwnedObjektsCursor } from "@repo/lib/types/objekt";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { fetchOwnedObjektsByCursor } from "./fetching-util";
import { mapObjektWithTag } from "./objekt-utils";
import { orpc } from "./orpc/client";
import type { OwnedBySchema } from "./universal/owned-by";

export const collectionOptions = (filters?: OwnedBySchema, enable = true) =>
  queryOptions({
    queryKey: ["collections", filters],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: enable,
    queryFn: async () => {
      const result = await ofetch<CollectionResult>("/api/collection", {
        query: {
          ...filters,
        },
      }).then((a) => a.collections);

      return result.map(mapObjektWithTag);
    },
    throwOnError: true,
  });

export const ownedCollectionOptions = (address: string, filters?: OwnedBySchema) =>
  infiniteQueryOptions({
    queryKey: ["owned-collections", address, filters],
    queryFn: ({ pageParam }) =>
      fetchOwnedObjektsByCursor(address, pageParam, filters).then((result) => ({
        objekts: result.objekts.map(mapObjektWithTag),
        nextCursor: result.nextCursor,
        total: result.total,
      })),
    initialPageParam: undefined as OwnedObjektsCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: filters?.at ? Infinity : 1000 * 60 * 5,
    throwOnError: true,
  });

export const sessionOptions = orpc.user.session.queryOptions({
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
