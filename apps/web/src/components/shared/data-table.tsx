import { createContext, type ReactNode, use } from "react";

import { activateOnKey } from "@/lib/a11y";
import { cn } from "@/lib/utils";

/**
 * The grid template and minimum width are declared once and read from context,
 * so a column can never be added to the header without the rows. Below the
 * minimum the table scrolls sideways; `data-scroll-x` tells the dev overflow
 * guard that scroller is deliberate.
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

export function DataTableHead({ children }: { children: ReactNode }) {
  const { columns, minWidth } = useTableShape();
  return (
    <div
      className={cn(
        "text-muted-foreground bg-secondary/60 grid h-9 items-center gap-3 border-b px-3.5 text-xs tracking-wide uppercase",
        columns,
        minWidth,
      )}
    >
      {children}
    </div>
  );
}

/**
 * `onActivate` makes the whole row the control, which only works for a row with
 * nothing interactive of its own — a link inside a button is invalid.
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
    "grid h-11 items-center gap-3 border-t px-3.5 text-sm first:border-t-0",
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
