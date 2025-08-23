import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { collectionOptions } from "@/lib/query-options";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useShapeObjekts } from "./use-shape-objekt";

export function useCollectionObjekts() {
  const shape = useShapeObjekts();
  const { selectedArtistIds } = useCosmoArtist();
  const query = useSuspenseQuery(collectionOptions(selectedArtistIds));
  return useMemo(() => shape(query.data), [shape, query.data]);
}
