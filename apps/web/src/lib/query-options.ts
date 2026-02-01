import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CollectionResult } from "@repo/lib/types/objekt";

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { fetchOwnedObjektsByCursor } from "@/components/profile/fetching-util";

import { authClient } from "./auth-client";
import { mapObjektWithTag } from "./objekt-utils";
import { getBaseURL } from "./utils";

export const collectionOptions = (artistIds: ValidArtist[], enable = true) =>
  queryOptions({
    queryKey: ["collections", artistIds],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: enable,
    queryFn: async () => {
      const url = new URL("/api/collection", getBaseURL());
      const result = await ofetch<CollectionResult>(url.toString(), {
        query: {
          artist: artistIds,
        },
      }).then((a) => a.collections);

      return result.map(mapObjektWithTag);
    },
  });

export const ownedCollectionOptions = (address: string, artistIds: ValidArtist[]) =>
  infiniteQueryOptions({
    queryKey: ["owned-collections", address, artistIds],
    queryFn: ({ pageParam }) =>
      fetchOwnedObjektsByCursor(address, artistIds, pageParam).then((result) => ({
        objekts: result.objekts.map(mapObjektWithTag),
        nextCursor: result.nextCursor,
      })),
    initialPageParam: undefined as { receivedAt: string; id: string } | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const result = await authClient.getSession();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
});
