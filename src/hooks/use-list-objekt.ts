import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orpc } from "@/lib/orpc/client";
import { mapObjektWithTag } from "@/lib/universal/objekts";
import { useCosmoArtist } from "./use-cosmo-artist";
import { useShapeObjekts } from "./use-shape-objekt";

export function useListObjekts(slug: string) {
  const shape = useShapeObjekts();
  const { selectedArtistIds } = useCosmoArtist();
  const query = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug,
        artists: selectedArtistIds,
      },
      select: (data) => data.map(mapObjektWithTag),
    }),
  );
  return useMemo(() => shape(query.data), [shape, query.data]);
}
