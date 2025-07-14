import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";
import type { ValidArtist } from "./universal/cosmo/common";
import { mapObjektWithTag, type ValidObjekt } from "./universal/objekts";
import { getBaseURL } from "./utils";

export const collectionOptions = (artistIds: ValidArtist[]) =>
  queryOptions({
    queryKey: ["collections", artistIds],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const url = new URL("/api/collection", getBaseURL());
      const result = await ofetch<{ collections: ValidObjekt[] }>(url.toString(), {
        cache: "force-cache",
        query: {
          artist: artistIds,
        },
      }).then((a) => a.collections);

      if (result.length === 0) return [];

      // check latest
      const resultLatest = await ofetch<{ collections: ValidObjekt[] }>(url.toString(), {
        query: {
          cursor: JSON.stringify({
            createdAt: result[0].createdAt,
            collectionId: result[0].collectionId,
          }),
          artist: artistIds,
        },
        cache: "no-store",
      }).then((a) => a.collections);

      if (resultLatest.length > 0) {
        // fetch all again without cache
        const result = await ofetch<{ collections: ValidObjekt[] }>(url.toString(), {
          cache: "reload",
          query: {
            artist: artistIds,
          },
        }).then((a) => a.collections);

        return result.map(mapObjektWithTag);
      }

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
