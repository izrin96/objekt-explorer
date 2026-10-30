import type { ReactNode } from "react";

import { m } from "@/paraglide/messages";

import { countMarkup, MessageMarkup } from "./message-markup";

/** "N total", the number standing out of muted text. */
export function TotalCount({ count }: { count: number }) {
  return (
    <MessageMarkup
      parts={m.common_count_total.parts({ count: count.toLocaleString() })}
      markup={countMarkup}
    />
  );
}

/** The row above a grid: the counts (children) on the left, the controls (aside) on the right. */
export function CountBar({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-muted-foreground text-xs tabular-nums">{children}</div>
      {aside}
    </div>
  );
}
