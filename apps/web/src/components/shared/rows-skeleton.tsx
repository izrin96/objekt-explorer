import { PendingStatus } from "@/components/router/pending";
import { Skeleton } from "@/components/ui/skeleton";

/** Stand-in rows for a list of row cards; `status` also announces the loading. */
export function RowsSkeleton({ rows = 3, status = false }: { rows?: number; status?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {status ? <PendingStatus /> : null}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}
