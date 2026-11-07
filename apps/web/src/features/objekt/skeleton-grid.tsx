import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";
import { useColumnsOrViewport } from "@/stores/columns";

import { ObjektGrid } from "./objekt-grid";
import { PhotocardSkeleton } from "./photocard-skeleton";

const ROWS = 3;

/** Past a narrower width's three rows, a placeholder hides below that width. */
const beyondRows = (index: number) =>
  index >= GRID_COLUMNS_TABLET * ROWS
    ? "max-lg:hidden"
    : index >= GRID_COLUMNS_MOBILE * ROWS
      ? "max-md:hidden"
      : undefined;

/**
 * Three rows of placeholders in the grid the results will land in, so the first
 * page does not shift the layout. `columns` is for a surface that owns its own
 * count (a profile, a list); everything else takes the responsive one, which until
 * the user picks a count is set by CSS, since the server can't read the viewport.
 */
export function SkeletonGrid({ columns }: { columns?: number }) {
  const responsive = useColumnsOrViewport();
  const count = columns ?? responsive;
  const viewport = count === "viewport";

  return (
    <ObjektGrid columns={count}>
      {Array.from({ length: (viewport ? GRID_COLUMNS : count) * ROWS }).map((_, index) => (
        <PhotocardSkeleton key={index} className={viewport ? beyondRows(index) : undefined} />
      ))}
    </ObjektGrid>
  );
}
