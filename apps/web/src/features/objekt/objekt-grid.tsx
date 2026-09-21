import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The virtual grid chunks its rows to the same `columns`, so this lays out
 * exactly that many at every width — a breakpoint clamp here would misalign them.
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
        "grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-3 gap-y-3.5 max-md:gap-x-2 max-md:gap-y-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
