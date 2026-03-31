import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { ownedCollectionOptions, type ServerFilters } from "@/lib/query-options";

export function useOwnedCollectionsServer(address: string, filters?: ServerFilters) {
  const query = useSuspenseInfiniteQuery(ownedCollectionOptions(address, filters));

  const objekts = query.data.pages.flatMap((page) => page.objekts);

  return {
    objekts,
    query,
  };
}
