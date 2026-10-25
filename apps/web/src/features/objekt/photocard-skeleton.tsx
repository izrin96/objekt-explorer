import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A photocard's shape while it loads. It is its own container: the photocard radius is a share
 * of the nearest container's width, which elsewhere would be the whole grid.
 */
export function PhotocardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("@container", className)}>
      <Skeleton className="aspect-photocard rounded-photocard w-full" />
    </div>
  );
}
