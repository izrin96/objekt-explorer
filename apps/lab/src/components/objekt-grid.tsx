import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The objekt grid. Every surface that lays cards out — Home, Market, a list,
 * the collection tab (grid *and* pinned shelf) and each Progress expansion —
 * renders through this, so the column count and the gaps cannot drift between
 * two grids on the same page.
 *
 * `columns` is the toolbar's setting and only applies from `md` up; below that
 * the grid is a fixed three columns, which is as many as a phone can show a
 * card at.
 */
export function ObjektGrid({
  columns,
  className,
  children,
}: {
  columns: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ "--cols": columns } as CSSProperties}
      className={cn(
        "grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-3 gap-y-3.5 max-md:grid-cols-3 max-md:gap-x-2 max-md:gap-y-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
