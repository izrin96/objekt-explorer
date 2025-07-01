import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { getBaseURL } from "@/lib/utils";

export const filterDataQuery = queryOptions({
  queryKey: ["filter-data"],
  queryFn: async () => {
    const url = new URL("/api/filter-data", getBaseURL());
    return await ofetch<FilterData>(url.toString());
  },
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});

export function useFilterData() {
  const { data } = useSuspenseQuery(filterDataQuery);

  return {
    collections: data.collections,
  };
}

export type FilterData = {
  collections: string[];
};
