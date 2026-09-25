import { Shimmer } from "@/components/shared/shimmer";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  /** null while loading */
  value: string | null;
  /** a quieter figure on the value's line; it wraps under the value only when the column is too narrow */
  detail?: string;
};

/**
 * Open figures on the drawer surface rather than a filled box. Dividers only
 * from `sm`: a phone wraps the row into a grid, where a leading rule would
 * land on the start of every row.
 */
export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-3", className)}>
      {stats.map(({ label, value, detail }) => (
        <div
          key={label}
          className="flex min-w-0 flex-col gap-0.5 sm:border-s sm:ps-4 sm:first:border-s-0 sm:first:ps-0"
        >
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-base font-medium tabular-nums">
            {value === null ? <Shimmer className="my-1 h-4 w-14" /> : value}
            {value !== null && detail !== undefined && (
              <span className="text-muted-foreground text-xs font-normal">{detail}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
