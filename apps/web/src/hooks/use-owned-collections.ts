import type { ValidArtist } from "@repo/cosmo/types/common";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { ownedCollectionOptions } from "@/lib/query-options";

/**
 * Hook that fetches all owned objekts for a given address and artist IDs.
 * Automatically fetches all pages progressively and returns flattened data.
 */
export function useOwnedCollections(address: string, artistIds: ValidArtist[]) {
  const query = useSuspenseInfiniteQuery(ownedCollectionOptions(address, artistIds));

  // Automatically fetch all pages
  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  // Flatten all pages into a single array
  const objekts = query.data.pages.flatMap((page) => page.objekts);

  return {
    objekts,
    hasNextPage: query.hasNextPage,
  };
}
