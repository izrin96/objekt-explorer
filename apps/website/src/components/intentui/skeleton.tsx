import { twMerge } from "tailwind-merge";

// custom — forked from upstream: keeps the `soft` block-pulse API instead of
// upstream's `isLoading` wrapper that pulses descendants
export interface SkeletonProps extends React.ComponentProps<"div"> {
  soft?: boolean;
}

export function Skeleton({ ref, soft = false, className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      ref={ref}
      className={twMerge(
        "shrink-0 animate-pulse rounded-lg",
        soft ? "bg-muted-fg/20" : "bg-muted-fg/40",
        className,
      )}
      {...props}
    />
  );
}
