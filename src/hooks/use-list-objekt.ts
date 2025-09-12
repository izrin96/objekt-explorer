import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orpc } from "@/lib/orpc/client";
import { mapObjektWithTag } from "@/lib/universal/objekts";
import { useShapeObjekts } from "./use-shape-objekt";

export function useListObjekts(slug: string) {
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug,
      },
      select: (data) => data.map(mapObjektWithTag),
    }),
  );
  return useMemo(() => shape(query.data), [shape, query.data]);
}
