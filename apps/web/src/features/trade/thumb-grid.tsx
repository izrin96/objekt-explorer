import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Monochrome on purpose: the class stripes stay the only colour in the grid. An outline, so the
 * card's own focus ring (a box-shadow) still shows on a ringed card; a 1px offset keeps two
 * ringed neighbours `gap-1.5` apart from overlapping, and the strip's `p-1` gives the edges room.
 */
export const RING = "rounded-photocard outline-foreground outline-2 outline-offset-1";

/** A near match: the ring's shape, dashed and muted, so it reads as almost and never as a match. */
export const NEAR_RING =
  "rounded-photocard outline-muted-foreground outline-2 outline-dashed outline-offset-1";

/** A photocard-shaped placeholder: the slug for a collection not loaded, or a "+N" count. */
export const TILE =
  "bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center";

/** Sits in a `@container` parent, so its radius matches the cards'. */
export function SlugTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(TILE, "p-2 text-center font-mono text-xs leading-snug break-all", className)}
    >
      {children}
    </div>
  );
}
