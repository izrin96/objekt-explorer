import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The virtual grid chunks its rows to the same `columns`, so this lays out
 * exactly that many at every width — a breakpoint clamp here would misalign them.
 *
 * The gutter follows card width, not the column count: the Wide setting lifts
 * the content cap, so 12 columns can be small or large cards. The wrapper is the
 * `@container` its `cqi` reads. `--gutter` is also for the virtual grid, whose
 * rows are each their own grid and so space themselves with padding.
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
    <div className="@container">
      <div
        style={{ "--cols": columns } as CSSProperties}
        className={cn(
          "grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-(--gutter) [--gutter:clamp(--spacing(1.5),6.5cqi/var(--cols),--spacing(3))]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
