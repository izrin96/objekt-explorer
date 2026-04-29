import { useInfiniteQuery } from "@tanstack/react-query";

import { ownedCollectionOptions } from "@/lib/query-options";
import type { OwnedBySchema } from "@/lib/universal/owned-by";

export function useOwnedCollectionsServer(address: string, filters?: OwnedBySchema) {
  const query = useInfiniteQuery(ownedCollectionOptions(address, filters));

  const objekts = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    objekts,
    total,
    query,
  };
}
