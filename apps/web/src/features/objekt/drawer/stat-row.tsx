import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  /** null while loading */
  value: string | null;
  /** a quieter figure on the value's line; it wraps under the value only when the column is too narrow */
  detail?: ReactNode;
};

/**
 * Open figures on the drawer surface rather than a filled box. Dividers only
 * from `sm`. Every figure carries a leading rule and the row is pulled back by
 * that rule and its padding, so whichever figure starts a row has its rule
 * clipped, however many columns fit. A `@container`, so callers can pick
 * columns by the row's own width (a drawer is narrower than the viewport).
 */
export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className="@container overflow-hidden">
      <dl className={cn("grid gap-x-4 gap-y-3 sm:-ms-[calc(--spacing(4)+1px)]", className)}>
        {stats.map(({ label, value, detail }) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5 sm:border-s sm:ps-4">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-1.5 text-base font-medium tabular-nums">
              {value === null ? <Skeleton className="my-1 h-4 w-14" /> : value}
              {value !== null && detail !== undefined && (
                <span className="text-muted-foreground text-xs font-normal">{detail}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
