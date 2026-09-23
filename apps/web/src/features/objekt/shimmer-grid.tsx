import { Shimmer } from "@/components/shared/shimmer";
import { useColumns } from "@/stores/columns";

import { ObjektGrid } from "./objekt-grid";

/**
 * Three rows of placeholders in the grid the results will land in, so the first
 * page does not shift the layout. `columns` is for a surface that owns its own
 * count (a profile, a list); everything else takes the responsive one.
 */
export function ShimmerGrid({ columns }: { columns?: number }) {
  const responsive = useColumns();
  const count = columns ?? responsive;

  return (
    <ObjektGrid columns={count}>
      {Array.from({ length: count * 3 }).map((_, index) => (
        <Shimmer key={index} className="aspect-photocard rounded-photocard w-full" />
      ))}
    </ObjektGrid>
  );
}
