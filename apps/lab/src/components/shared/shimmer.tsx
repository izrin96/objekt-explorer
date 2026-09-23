import { cn } from "@/lib/utils";

/**
 * Placeholder block for a value that is still loading. Sized by the caller so
 * the skeleton occupies the same box the real value will.
 */
export function Shimmer({ className }: { className?: string }): React.ReactElement {
  return <span className={cn("bg-secondary block animate-pulse rounded-sm", className)} />;
}
