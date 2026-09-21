import type { CollectionResult, OwnedObjektsCursor } from "@repo/api/schemas/objekt";
import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { fetchOwnedObjektsByCursor } from "./fetching-util";
import { mapObjektWithTag } from "./objekt-utils";
import { orpc } from "./orpc/client";

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

export const currentUserOptions = orpc.user.currentUser.queryOptions({
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
