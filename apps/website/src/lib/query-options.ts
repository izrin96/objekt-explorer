import type {
  ValidArtist,
  ValidCustomSort,
  ValidOnlineType,
  ValidSortDirection,
} from "@repo/cosmo/types/common";
import type { CollectionResult, OwnedObjektsCursor } from "@repo/lib/types/objekt";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { fetchOwnedObjektsByCursor } from "./fetching-util";
import { mapObjektWithTag } from "./objekt-utils";
import { orpc } from "./orpc/client";
import { getBaseURL } from "./utils";

export type ServerFilters = {
  at?: string;
  artist?: ValidArtist[];
  member?: string[];
  class?: string[];
  season?: string[];
  onOffline?: ValidOnlineType[];
  transferable?: boolean;
  collection?: string[];
  sort?: ValidCustomSort;
  sort_dir?: ValidSortDirection;
  includeCount?: boolean;
  limit?: number;
};

export const collectionOptions = (filters?: ServerFilters, enable = true) =>
  queryOptions({
    queryKey: ["collections", filters],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: enable,
    queryFn: async () => {
      const url = new URL("/api/collection", getBaseURL());
      const result = await ofetch<CollectionResult>(url.toString(), {
        query: {
          ...filters,
        },
      }).then((a) => a.collections);

      return result.map(mapObjektWithTag);
    },
  });

export const ownedCollectionOptions = (address: string, filters?: ServerFilters) =>
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
  });

export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: () => orpc.user.session.call(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
