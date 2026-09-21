import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * `bordered` draws the dashed box a page-level empty region wants; a panel with
 * a border of its own passes false so the state is not framed twice.
 */
export function EmptyState({
  icon: Glyph,
  title,
  hint,
  action,
  bordered = true,
  className,
}: {
  icon: Icon;
  title: string;
  hint?: string;
  action?: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center",
        bordered && "rounded-lg border border-dashed",
        className,
      )}
    >
      <Glyph size={40} weight="light" className="text-muted-foreground mb-1" aria-hidden />
      <p className="font-display text-[15px] font-semibold">{title}</p>
      {hint !== undefined && <p className="text-muted-foreground max-w-80 text-[13px]">{hint}</p>}
      {action !== undefined && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
