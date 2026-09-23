import { createContext, type ReactNode, use } from "react";

import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";

/**
 * The one column-grid table in the lab.
 *
 * Both Activity surfaces — the global feed and the profile tab — are the same
 * object: a header of column names over rows whose cells line up under it. The
 * grid template and the minimum width are declared once, on `DataTable`, and
 * read from context by the header and every row; written per call site they
 * have to be kept in step by hand, and a column added to one and not the other
 * is a header that lies.
 *
 * The sideways scroll is the mobile answer for both. A column grid has a floor
 * it cannot go under without the cells colliding, so below that width the
 * table scrolls rather than reflowing, and `data-scroll-x` tells the dev
 * overflow guard that this scroller is deliberate.
 */
type TableShape = {
  /** the `grid-cols-[…]` every row and the header share */
  columns: string;
  /** the `min-w-*` the sideways scroll is bought against */
  minWidth: string;
};

const TableContext = createContext<TableShape | null>(null);

function useTableShape(): TableShape {
  const shape = use(TableContext);
  if (!shape) throw new Error("DataTableHead / DataTableRow must be inside a <DataTable />");
  return shape;
}

export function DataTable({
  columns,
  minWidth,
  className,
  children,
}: TableShape & { className?: string; children: ReactNode }) {
  return (
    <TableContext value={{ columns, minWidth }}>
      <div data-scroll-x className={cn("bg-card overflow-x-auto rounded-lg border", className)}>
        {children}
      </div>
    </TableContext>
  );
}

/** the column names; one per track, in the same order the rows fill them */
export function DataTableHead({ children }: { children: ReactNode }) {
  const { columns, minWidth } = useTableShape();
  return (
    <div
      className={cn(
        "text-muted-foreground bg-secondary/60 grid h-9 items-center gap-3 border-b px-3.5 text-[11.5px] tracking-wide uppercase",
        columns,
        minWidth,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One row. `onActivate` makes the whole row the control — which only works for
 * a row with nothing interactive of its own: the profile table's counterparty
 * is a `<Link>`, and a link inside a button is invalid, so that surface leaves
 * this off and puts the trigger on its objekt cell instead.
 */
export function DataTableRow({
  onActivate,
  className,
  children,
}: {
  onActivate?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const { columns, minWidth } = useTableShape();
  const shared = cn(
    "grid h-11 items-center gap-3 border-t px-3.5 text-[13px] first:border-t-0",
    columns,
    minWidth,
    className,
  );

  if (!onActivate) return <div className={shared}>{children}</div>;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => activateOnKey(e, onActivate)}
      className={cn(
        shared,
        "hover:bg-secondary/50 focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:ring-inset",
      )}
    >
      {children}
    </div>
  );
}
