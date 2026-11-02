import type { ReactNode } from "react";

import { ScrollAreaPrimitive, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const FADE = {
  both: "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))]",
  // a pinned heading at the top would fade with it
  bottom: "mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))]",
} as const;

/**
 * A vertical scroll area with edge fades, sized by flex rather than `h-full`, so a `max-h` frame
 * or a flex column bounds it. The shared `ScrollArea` can't: its viewport is `h-full`, which only
 * a set height resolves, and its focus ring sits outside the box, where the fade mask clips it.
 */
export function FadeScrollArea({
  fade = "both",
  wrapContent = true,
  className,
  children,
}: {
  fade?: keyof typeof FADE;
  /** off when the child brings its own `ScrollArea.Content`, as `PanelCardGrid` does */
  wrapContent?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ScrollAreaPrimitive.Root className={cn("flex min-h-0 flex-col", className)}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "focus-visible:ring-ring min-h-0 flex-1 overscroll-y-contain rounded-[inherit] outline-none [--fade-size:1.5rem] focus-visible:ring-2 focus-visible:ring-inset",
          FADE[fade],
        )}
      >
        {wrapContent ? (
          // Content lets the fades follow the content growing; its default `fit-content` minimum
          // width would stop no-wrap text from truncating
          <ScrollAreaPrimitive.Content style={{ minWidth: 0 }}>
            {children}
          </ScrollAreaPrimitive.Content>
        ) : (
          children
        )}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
    </ScrollAreaPrimitive.Root>
  );
}
