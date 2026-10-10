import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { RunPosition } from "./bubble-run";

export function Bubble({
  mine,
  position,
  unsent = false,
  children,
}: {
  mine: boolean;
  position: RunPosition;
  unsent?: boolean;
  children: ReactNode;
}) {
  const joinsAbove = position === "middle" || position === "last";
  return (
    <p
      className={cn(
        "max-w-105 rounded-2xl border px-3.5 py-2 text-sm wrap-anywhere whitespace-pre-wrap",
        mine ? "rounded-ee-sm" : "rounded-es-sm",
        joinsAbove && (mine ? "rounded-se-sm" : "rounded-ss-sm"),
        unsent
          ? "text-muted-foreground border-dashed italic"
          : mine
            ? "bg-chat-mine text-foreground border-transparent"
            : "bg-card text-card-foreground",
      )}
    >
      {children}
    </p>
  );
}
