import type { ReactNode } from "react";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * The dot ends each part rather than starting the next, so a wrapped line never starts with
 * one; inline-block keeps the part's underline off it.
 */
const DOT_AFTER =
  "after:text-muted-foreground after:ms-2 after:inline-block after:font-normal after:no-underline after:content-['·']";

/**
 * A partner's counts in one order on both tabs. Mutual is derived here, so Browse and For you
 * can't disagree on it.
 */
export function MatchLine({
  theyHave,
  youHave,
  popover,
  children,
}: {
  theyHave: number;
  youHave: number;
  popover?: ReactNode;
  children?: ReactNode;
}) {
  const mutual = Math.min(theyHave, youHave);
  const counted = theyHave > 0 || youHave > 0;
  if (!counted && !children) return null;
  const opens = popover ? "underline decoration-dotted underline-offset-2" : undefined;

  const parts = [
    theyHave > 0
      ? { key: "they", text: m.trade_match_they_have({ count: theyHave }), line: opens }
      : null,
    youHave > 0
      ? { key: "you", text: m.trade_match_you_have({ count: youHave }), line: opens }
      : null,
    mutual > 0
      ? { key: "mutual", text: m.trade_match_mutual({ count: mutual }), line: "font-semibold" }
      : null,
  ].filter((part) => part !== null);
  const counts = parts.map((part, i) => (
    <span key={part.key} className={cn(part.line, (i < parts.length - 1 || children) && DOT_AFTER)}>
      {part.text}
    </span>
  ));

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
      {!counted ? null : popover ? (
        <Popover>
          <PopoverTrigger className="focus-visible:ring-ring flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-sm text-start outline-none focus-visible:ring-2">
            {counts}
          </PopoverTrigger>
          <PopoverPopup align="start" className="w-72">
            {popover}
          </PopoverPopup>
        </Popover>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">{counts}</p>
      )}
      {children}
    </div>
  );
}
