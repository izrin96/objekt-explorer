import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A photocard-shaped placeholder: the slug for a collection not loaded, or a "+N" count. */
export const TILE =
  "bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center font-mono";

/** Sits in a `@container` parent, so its radius matches the cards'. */
export function SlugTile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn(TILE, "p-2 text-center text-xs leading-snug break-all", className)}>
      {children}
    </div>
  );
}
