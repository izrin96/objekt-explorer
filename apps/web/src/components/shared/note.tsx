import type { ReactNode } from "react";

import { TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** `border-current/15`, so the border takes the note's own ink. */
export function Note({
  intent = "default",
  className,
  children,
}: {
  intent?: "default" | "warning";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="note"
      className={cn(
        "w-full rounded-lg border border-current/15 p-4 text-sm/6 text-pretty",
        intent === "default" && "bg-muted/50 text-secondary-foreground",
        intent === "warning" && [TONE_FILL.warning, TONE_INK.warning],
        className,
      )}
    >
      {children}
    </div>
  );
}
