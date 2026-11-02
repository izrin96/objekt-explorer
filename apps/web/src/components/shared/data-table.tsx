import { createContext, type ReactNode, use } from "react";

import { cn } from "@/lib/utils";

/**
 * The grid template and minimum width are declared once and read from context,
 * so a column can never be added to the header without the rows. Below the
 * minimum the table scrolls sideways; `data-scroll-x` tells the dev overflow
 * guard that scroller is deliberate. The rows are divs so `virtua` can window
 * them, which a `<table>` does not allow; the ARIA table roles stand in for it.
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
  label,
  className,
  children,
}: TableShape & { label: string; className?: string; children: ReactNode }) {
  return (
    <TableContext value={{ columns, minWidth }}>
      <div
        data-scroll-x
        role="table"
        aria-label={label}
        className={cn("bg-card overflow-x-auto rounded-lg border", className)}
      >
        {children}
      </div>
    </TableContext>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  const { columns, minWidth } = useTableShape();
  return (
    <div
      role="row"
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

export function DataTableRow({ className, children }: { className?: string; children: ReactNode }) {
  const { columns, minWidth } = useTableShape();
  return (
    <div
      role="row"
      className={cn(
        "grid h-11 items-center gap-3 border-t px-3.5 text-sm first:border-t-0",
        columns,
        minWidth,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTableColumnHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span role="columnheader" className={className}>
      {children}
    </span>
  );
}

export function DataTableCell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="cell" className={cn("flex min-w-0 items-center self-stretch", className)}>
      {children}
    </div>
  );
}
