import { queryOptions } from "@tanstack/react-query";
import { getBaseURL } from "./utils";
import { IndexedObjekt } from "./universal/objekts";
import { ofetch } from "ofetch";

export const collectionOptions = queryOptions({
  queryKey: ["collections"],
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  queryFn: async ({}) => {
    const url = new URL(`/api/collection`, getBaseURL());
    return await ofetch<{ collections: IndexedObjekt[] }>(url.toString()).then(
      (a) => a.collections
    );
  },
});
