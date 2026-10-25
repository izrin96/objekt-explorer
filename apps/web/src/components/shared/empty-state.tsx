import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * `bordered` draws the dashed box a page-level empty region wants; a panel with
 * a border of its own passes false so the state is not framed twice. `preview`
 * stands in for the icon with an example of what will show up.
 */
export function EmptyState({
  icon: Glyph,
  title,
  hint,
  action,
  preview,
  bordered = true,
  className,
}: {
  icon: Icon;
  title: string;
  hint?: string;
  action?: ReactNode;
  preview?: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <Empty
      className={cn(
        "flex-none gap-3 md:py-12",
        bordered && "rounded-lg border border-dashed",
        className,
      )}
    >
      <EmptyHeader className="[&>[data-slot=empty-media]]:mb-4">
        {preview !== undefined ? (
          <EmptyMedia>{preview}</EmptyMedia>
        ) : (
          <EmptyMedia variant="icon">
            <Glyph aria-hidden />
          </EmptyMedia>
        )}
        <EmptyTitle className="font-display text-base">{title}</EmptyTitle>
        {hint !== undefined && <EmptyDescription className="max-w-80">{hint}</EmptyDescription>}
      </EmptyHeader>
      {action !== undefined && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
