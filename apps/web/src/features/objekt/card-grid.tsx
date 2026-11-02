import type { ReactNode } from "react";

import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";

import { PhotocardSkeleton } from "./photocard-skeleton";

/** Card width the grid aims for; the column count follows the container's width. */
const CELL_PX = 112;

/** The column count of a card grid in a dialog or sheet: one per `CELL_PX` of width, at least three. */
export function useCardColumns<T extends HTMLElement>() {
  const [ref, { width }] = useElementSize<T>();
  return { ref, measured: width > 0, columns: Math.max(3, Math.floor(width / CELL_PX)) };
}

/** Spacing `VirtualCardGrid` gets from its rows' `gap-2 pb-3`. */
const GAPS = "gap-x-2 gap-y-3";

function columnsStyle(columns: number) {
  return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
}

/**
 * `VirtualCardGrid`'s layout without the virtualising, for a short list inside a panel that
 * scrolls. Hidden until measured, so the first frame does not show the wrong column count.
 */
export function CardGrid({ className, children }: { className?: string; children: ReactNode }) {
  const { ref, measured, columns } = useCardColumns<HTMLUListElement>();
  return (
    <ul
      ref={ref}
      className={cn("grid", GAPS, !measured && "invisible", className)}
      style={columnsStyle(columns)}
    >
      {children}
    </ul>
  );
}

/** Placeholders in the columns the loaded card grid will have. */
export function CardGridSkeleton({ rows = 2 }: { rows?: number }) {
  const { ref, measured, columns } = useCardColumns<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-busy
      className={cn("grid", GAPS, !measured && "invisible")}
      style={columnsStyle(columns)}
    >
      {Array.from({ length: columns * rows }, (_, i) => (
        <PhotocardSkeleton key={i} />
      ))}
    </div>
  );
}
