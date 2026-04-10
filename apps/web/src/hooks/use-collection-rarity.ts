import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@/lib/orpc/client";

import { useFilters } from "./use-filters";

export interface CollectionRarity {
  slug: string;
  count: number;
}

export function useCollectionRarity() {
  const [filters] = useFilters();
  const { data } = useQuery(
    orpc.collections.rarity.queryOptions({
      staleTime: 1000 * 60 * 60,
      enabled: filters.sort === "rare",
    }),
  );

  return useMemo(() => {
    if (!data) return undefined;
    return new Map(data.map((r) => [r.slug, r.count]));
  }, [data]);
}
