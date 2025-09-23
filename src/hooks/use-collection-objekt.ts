import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { collectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCollectionObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const { selectedArtistIds } = useCosmoArtist();
  const query = useSuspenseQuery(collectionOptions(selectedArtistIds));
  return useMemo(() => {
    const filtered = filter(query.data);
    return { shaped: shape(filtered), filtered };
  }, [shape, filter, query.data]);
}
