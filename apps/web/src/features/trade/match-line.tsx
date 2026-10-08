import type { ReactNode } from "react";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { TONE_INK, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The dot ends each part rather than starting the next, so a wrapped line never starts with one. */
const DOT_AFTER = "after:text-muted-foreground after:ms-2 after:font-normal after:content-['·']";

/**
 * They have fills one of the viewer's want lists, so it takes the want colour; you have comes
 * off a have list.
 */
export const MATCH_TONE = {
  theyHave: cn(TONE_INK.want, "decoration-type-want/55"),
  youHave: cn(TONE_INK.have, "decoration-type-have/55"),
};

const MUTUAL_CHIP = cn(toneChip("progress"), "rounded-sm border px-1 font-semibold");

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
      ? {
          key: "they",
          text: m.trade_match_they_have({ count: theyHave }),
          tone: cn(MATCH_TONE.theyHave, opens),
        }
      : null,
    youHave > 0
      ? {
          key: "you",
          text: m.trade_match_you_have({ count: youHave }),
          tone: cn(MATCH_TONE.youHave, opens),
        }
      : null,
    mutual > 0
      ? { key: "mutual", text: m.trade_match_mutual({ count: mutual }), tone: MUTUAL_CHIP }
      : null,
  ].filter((part) => part !== null);
  const counts = parts.map((part, i) => (
    <span key={part.key} className={i < parts.length - 1 || children ? DOT_AFTER : undefined}>
      <span className={part.tone}>{part.text}</span>
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
