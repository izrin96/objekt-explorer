import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orpc } from "@/lib/orpc/client";
import { mapObjektWithTag } from "@/lib/universal/objekts";
import { useObjektFilter } from "./use-objekt-filter";
import { useShapeObjekts } from "./use-shape-objekt";

export function useListObjekts(slug: string) {
  const filter = useObjektFilter();
  const shape = useShapeObjekts();
  const query = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug,
      },
      select: (data) => data.map(mapObjektWithTag),
    }),
  );
  return useMemo(() => {
    const filtered = filter(query.data);
    return { shaped: shape(filtered), filtered };
  }, [shape, filter, query.data]);
}
