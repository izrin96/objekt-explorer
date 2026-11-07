import type { CSSProperties, ReactNode } from "react";

import { GRID_COLUMNS, GRID_COLUMNS_MOBILE, GRID_COLUMNS_TABLET, cn } from "@/lib/utils";

/**
 * The virtual grid chunks its rows to the same `columns`, so this lays out
 * exactly that many at every width — a breakpoint clamp here would misalign them.
 *
 * The gutter follows card width, not the column count: the Wide setting lifts
 * the content cap, so 12 columns can be small or large cards. The wrapper is the
 * `@container` its `cqi` reads. `--gutter` is also for the virtual grid, whose
 * rows are each their own grid and so space themselves with padding.
 */
const VIEWPORT_COLUMNS = {
  "--cols-sm": GRID_COLUMNS_MOBILE,
  "--cols-md": GRID_COLUMNS_TABLET,
  "--cols-lg": GRID_COLUMNS,
} as CSSProperties;

export function ObjektGrid({
  columns,
  className,
  children,
}: {
  /** `"viewport"`: the count `useColumns` follows, set by CSS so the server draws it too */
  columns: number | "viewport";
  className?: string;
  children: ReactNode;
}) {
  const viewport = columns === "viewport";
  return (
    <div className="@container">
      <div
        style={viewport ? VIEWPORT_COLUMNS : ({ "--cols": columns } as CSSProperties)}
        className={cn(
          "grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-(--gutter) [--gutter:clamp(--spacing(1.5),6.5cqi/var(--cols),--spacing(3))]",
          viewport &&
            "[--cols:var(--cols-sm)] md:[--cols:var(--cols-md)] lg:[--cols:var(--cols-lg)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
