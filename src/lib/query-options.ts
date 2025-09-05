import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";
import type { ValidArtist } from "./universal/cosmo/common";
import { type CollectionResult, mapObjektWithTag } from "./universal/objekts";
import { getBaseURL } from "./utils";

export const collectionOptions = (artistIds: ValidArtist[]) =>
  queryOptions({
    queryKey: ["collections", artistIds],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
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
  queryOptions({
    queryKey: ["owned-collections", address, artistIds],
    queryFn: () =>
      fetchOwnedObjekts(address, artistIds).then((a) => a.objekts.map(mapObjektWithTag)),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
