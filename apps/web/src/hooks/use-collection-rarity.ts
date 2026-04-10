import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@/lib/orpc/client";

export interface CollectionRarity {
  slug: string;
  count: number;
}

export function useCollectionRarity() {
  const { data } = useQuery(
    orpc.collections.rarity.queryOptions({
      staleTime: 1000 * 60 * 60,
    }),
  );

  return useMemo(() => {
    if (!data) return undefined;
    return new Map(data.map((r) => [r.slug, r.count]));
  }, [data]);
}
