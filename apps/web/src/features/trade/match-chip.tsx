import { type MatchCounts, mutualOf } from "@repo/api/schemas/trade";
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

const CHIP =
  "inline-flex h-6 max-w-full min-w-0 items-center rounded-md border px-2 font-mono text-xs tabular-nums";

/** A person's counts in words, the same on both tabs: mutual is `mutualOf`. */
export function MatchChip({ counts, popover }: { counts: MatchCounts; popover?: ReactNode }) {
  const { theyHave, youHave } = counts;
  if (theyHave === 0 && youHave === 0) return null;
  const mutual = mutualOf(counts);
  const tone =
    mutual > 0 ? toneChip("progress") : "bg-secondary text-muted-foreground border-transparent";
  const content =
    mutual > 0
      ? m.trade_chip_mutual({ mutual, theyHave, youHave })
      : theyHave > 0 && youHave > 0
        ? m.trade_chip_both({ theyHave, youHave })
        : theyHave > 0
          ? m.trade_match_they_have({ count: theyHave })
          : m.trade_match_you_have({ count: youHave });

  if (!popover) {
    return (
      <span className={cn(CHIP, tone)}>
        <span className="truncate">{content}</span>
      </span>
    );
  }
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          CHIP,
          tone,
          "focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
      >
        <span className="truncate">{content}</span>
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-72">
        {popover}
      </PopoverPopup>
    </Popover>
  );
}
