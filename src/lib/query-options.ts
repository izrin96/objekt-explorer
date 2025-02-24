import { queryOptions } from "@tanstack/react-query";
import { getBaseURL } from "./utils";
import { IndexedObjekt } from "./universal/objekts";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";

export const collectionOptions = queryOptions({
  queryKey: ["collections"],
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const url = new URL(`/api/collection`, getBaseURL());
    return await ofetch<{ collections: IndexedObjekt[] }>(url.toString()).then(
      (a) => a.collections
    );
  },
});

export const ownedCollectionOptions = (address: string) =>
  queryOptions({
    queryKey: ["owned-collections", address],
    queryFn: async () =>
      fetchOwnedObjekts({
        address: address,
      }).then((a) => a.objekts),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
