import { identiconGrid } from "@/lib/identicon";
import { cn } from "@/lib/utils";

/** A mirrored 5x5 grid from an address, in the current text colour on a muted tile. */
export function Identicon({ address, className }: { address: string; className?: string }) {
  const grid = identiconGrid(address);
  return (
    <svg
      viewBox="0 0 7 7"
      aria-hidden
      className={cn("bg-muted text-foreground/70 size-10 shrink-0", className)}
    >
      {grid.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
