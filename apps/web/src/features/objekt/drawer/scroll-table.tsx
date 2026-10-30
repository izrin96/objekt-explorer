import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The header row of every drawer table. */
export const headRowClass = "text-muted-foreground bg-secondary/60 text-xs tracking-wide uppercase";

/**
 * A drawer table in its own horizontal scroller. The region takes focus so the
 * columns past the fold are reachable without a pointer; `data-scroll-x` tells
 * the dev overflow guard the clipping is on purpose.
 */
export function ScrollTable({
  label,
  className = "min-w-96",
  clipY = true,
  children,
}: {
  label: string;
  /** Extra classes for the `<table>`; replaces the default `min-w-96`. */
  className?: string;
  /** Clip the vertical axis instead of letting the scroller grow a scrollbar. */
  clipY?: boolean;
  /** The `thead` and `tbody`. */
  children: ReactNode;
}) {
  return (
    <div
      data-scroll-x
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "bg-card focus-visible:ring-ring overflow-x-auto rounded-lg border outline-none focus-visible:ring-2",
        clipY && "overflow-y-hidden",
      )}
    >
      <table className={cn("w-full border-collapse text-sm", className)}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}
