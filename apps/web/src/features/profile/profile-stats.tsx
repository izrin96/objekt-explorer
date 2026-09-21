import type { ReactNode } from "react";

type Cell = { value: ReactNode; unit?: string; label: string };

export function ProfileStats({ cells }: { cells: [Cell, Cell, Cell, Cell] }) {
  return (
    <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border md:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-popover px-3.5 py-3">
          <dd className="font-mono text-xl font-semibold tracking-tight tabular-nums">
            {cell.value}
            {cell.unit !== undefined && (
              <small className="text-muted-foreground ml-1 text-xs font-medium">{cell.unit}</small>
            )}
          </dd>
          <dt className="text-muted-foreground mt-0.5 text-xs">{cell.label}</dt>
        </div>
      ))}
    </dl>
  );
}
