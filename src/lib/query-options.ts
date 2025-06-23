import { queryOptions } from "@tanstack/react-query";
import { getBaseURL } from "./utils";
import { mapObjektWithTag, ValidObjekt } from "./universal/objekts";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";

export const collectionOptions = queryOptions({
  queryKey: ["collections"],
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const url = new URL("/api/collection", getBaseURL());
    const result = await ofetch<{ collections: ValidObjekt[] }>(
      url.toString(),
      {
        cache: "force-cache",
      }
    ).then((a) => a.collections);

    if (result.length === 0) return [];

    // check latest
    const resultLatest = await ofetch<{ collections: ValidObjekt[] }>(
      url.toString(),
      {
        query: {
          cursor: JSON.stringify({
            createdAt: result[0].createdAt,
            collectionId: result[0].collectionId,
          }),
        },
        cache: "no-store",
      }
    ).then((a) => a.collections);

    if (resultLatest.length > 0) {
      // fetch all again without cache
      const result = await ofetch<{ collections: ValidObjekt[] }>(
        url.toString(),
        {
          cache: "reload",
        }
      ).then((a) => a.collections);

      return result;
    }

    return result;
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
