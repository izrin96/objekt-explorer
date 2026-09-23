import { cn } from "@/lib/utils";

/** Sized by the caller, so it occupies the box the real value will. */
export function Shimmer({ className }: { className?: string }): React.ReactElement {
  return <span className={cn("bg-secondary block animate-pulse rounded-sm", className)} />;
}
