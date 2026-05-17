import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { ownedCollectionOptions } from "@/lib/query-options";
import type { OwnedBySchema } from "@/lib/universal/owned-by";

export function useOwnedCollections(address: string, filters?: OwnedBySchema) {
  const query = useInfiniteQuery(ownedCollectionOptions(address, filters));

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const objekts = query.data?.pages.flatMap((page) => page.objekts) ?? [];

  return {
    objekts,
    query,
  };
}
