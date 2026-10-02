import type { ReactNode } from "react";

import { TooltipPrimitive } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Every hover card opens and closes on the same beat. */
export const cursorCardDelays = { delay: 120, closeDelay: 100 } as const;

/**
 * One card shared by every trigger on its handle, so a long table mounts a
 * single popup. It follows the cursor, which makes it unreachable: it is
 * display-only and the trigger stays the action.
 */
export function CursorCard<Payload>({
  handle,
  className,
  children,
}: {
  handle: TooltipPrimitive.Handle<Payload>;
  className?: string;
  children: (payload: Payload) => ReactNode;
}) {
  return (
    <TooltipPrimitive.Root handle={handle} trackCursorAxis="both">
      {({ payload }) => (
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side="bottom" align="start" sideOffset={16} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                "bg-popover text-popover-foreground origin-(--transform-origin) overflow-hidden rounded-lg border shadow-lg/5 transition-[scale,opacity] not-dark:bg-clip-padding data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
                className,
              )}
            >
              {payload !== undefined && children(payload)}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      )}
    </TooltipPrimitive.Root>
  );
}
