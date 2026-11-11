import { cn } from "@/lib/utils";

import { PhotocardSkeleton } from "./photocard-skeleton";
import { useCardColumns } from "./use-card-columns";

/** Spacing `VirtualCardGrid` gets from its rows' `gap-2 pb-3`. */
const GAPS = "gap-x-2 gap-y-3";

function columnsStyle(columns: number) {
  return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
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
