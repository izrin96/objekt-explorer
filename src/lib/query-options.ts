import { isServer, queryOptions } from "@tanstack/react-query";
import { getBaseURL } from "./utils";
import { mapObjektWithTag, ValidObjekt } from "./universal/objekts";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";
import { useCollectionsStore } from "@/hooks/use-collections-store";

export const collectionOptions = queryOptions({
  queryKey: ["collections"],
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    if (isServer) return [];

    const { lastCursor, setLastCursor, setCollections, addCollections } =
      useCollectionsStore.getState();

    const url = new URL("/api/collection", getBaseURL());
    const result = await ofetch<{ collections: ValidObjekt[] }>(
      url.toString(),
      {
        query: {
          cursor: lastCursor ? JSON.stringify(lastCursor) : undefined,
        },
      }
    ).then((a) => a.collections);

    if (result.length > 0) {
      if (lastCursor) {
        addCollections(result);
      } else {
        setCollections(result);
      }

      setLastCursor({
        createdAt: result[0].createdAt,
        collectionId: result[0].collectionId,
      });
    }

    return useCollectionsStore.getState().collections.map(mapObjektWithTag);
  },
});

export const ownedCollectionOptions = (address: string) =>
  queryOptions({
    queryKey: ["owned-collections", address],
    queryFn: () =>
      fetchOwnedObjekts(address).then((a) => a.objekts.map(mapObjektWithTag)),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
