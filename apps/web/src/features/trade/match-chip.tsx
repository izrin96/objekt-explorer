import type { ReactNode } from "react";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { TONE_INK, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * They have fills one of the viewer's want lists, so it takes the want colour; you have comes
 * off a have list.
 */
export const MATCH_TONE = {
  theyHave: cn(TONE_INK.want, "decoration-type-want/55"),
  youHave: cn(TONE_INK.have, "decoration-type-have/55"),
};

const CHIP = "inline-flex h-6 items-center rounded-md border px-2 font-mono text-xs tabular-nums";

/**
 * A partner's counts in one order on both tabs. Mutual is derived here, so Browse and For you
 * can't disagree on it.
 */
export function MatchChip({
  theyHave,
  youHave,
  popover,
}: {
  theyHave: number;
  youHave: number;
  popover?: ReactNode;
}) {
  if (theyHave === 0 && youHave === 0) return null;
  const mutual = Math.min(theyHave, youHave);
  const tone =
    mutual > 0 ? toneChip("progress") : "bg-secondary text-muted-foreground border-transparent";
  const text =
    mutual > 0
      ? m.trade_chip_mutual({ mutual, theyHave, youHave })
      : m.trade_chip_counts({ theyHave, youHave });
  const content = (
    <>
      <span aria-hidden>{text}</span>
      <span className="sr-only">
        {[
          theyHave > 0 ? m.trade_match_they_have({ count: theyHave }) : null,
          youHave > 0 ? m.trade_match_you_have({ count: youHave }) : null,
          mutual > 0 ? m.trade_match_mutual({ count: mutual }) : null,
        ]
          .filter((part) => part !== null)
          .join(", ")}
      </span>
    </>
  );

  if (!popover) return <span className={cn(CHIP, tone)}>{content}</span>;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          CHIP,
          tone,
          "focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
      >
        {content}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        {popover}
      </PopoverPopup>
    </Popover>
  );
}
