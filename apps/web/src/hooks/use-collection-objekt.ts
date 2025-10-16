import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { collectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCollectionObjekts() {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const { selectedArtistIds } = useCosmoArtist();
  const query = useSuspenseQuery(collectionOptions(selectedArtistIds));
  const [filters] = useFilters();
  const filtered = filter(query.data);
  return useDeferredValue({ shaped: shape(filtered), filtered, filters });
}
