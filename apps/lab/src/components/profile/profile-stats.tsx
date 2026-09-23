import type { ReactNode } from "react";

type Cell = { value: ReactNode; unit?: string; label: string };

/** Port of `.stats` from the mockup: 4 cells, mono numbers, 1px grid lines. */
export function ProfileStats({ cells }: { cells: [Cell, Cell, Cell, Cell] }) {
  return (
    <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border md:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-popover px-3.5 py-3">
          <dd className="font-mono text-xl font-semibold tracking-tight">
            {c.value}
            {c.unit && (
              <small className="text-muted-foreground ml-1 text-xs font-medium">{c.unit}</small>
            )}
          </dd>
          <dt className="text-muted-foreground mt-0.5 text-xs">{c.label}</dt>
        </div>
      ))}
    </dl>
  );
}
