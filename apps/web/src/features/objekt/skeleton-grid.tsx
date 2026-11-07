import type { GridObjekt } from "@repo/lib/types/objekt";

import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET } from "@/lib/utils";
import { useColumnsOrViewport } from "@/stores/columns";

import { ObjektCard } from "./objekt-card";
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
 *
 * `lead` fills the first cells with the cards the results start with, sent with the page so the
 * first row paints before the whole list arrives; the results then draw the same cards in place.
 */
export function SkeletonGrid({ columns, lead = [] }: { columns?: number; lead?: GridObjekt[] }) {
  const responsive = useColumnsOrViewport();
  const count = columns ?? responsive;
  const viewport = count === "viewport";

  return (
    <ObjektGrid columns={count}>
      {Array.from({ length: (viewport ? GRID_COLUMNS : count) * ROWS }).map((_, index) => {
        const className = viewport ? beyondRows(index) : undefined;
        const objekt = lead[index];
        return objekt ? (
          <ObjektCard
            key={objekt.id}
            objekt={objekt}
            // the narrowest first row: eager there, and in view at every width
            priority={index < GRID_COLUMNS_MOBILE}
            fetchPriority={index < GRID_COLUMNS_MOBILE ? "high" : undefined}
            className={className}
          />
        ) : (
          <PhotocardSkeleton key={index} className={className} />
        );
      })}
    </ObjektGrid>
  );
}
