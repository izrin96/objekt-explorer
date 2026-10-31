import { ArrowDownIcon, ArrowsLeftRightIcon, ArrowUpIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { MatchBand } from "./person-row";
import { WithNumber } from "./with-number";

/**
 * Beside a person's name: what the two can swap, tinted, with how much of it needs the viewer's
 * rules (`swapThroughRules`). One way has no chip, since For you heads that section already.
 */
export function MatchChip({ band, throughRules = 0 }: { band: MatchBand; throughRules?: number }) {
  if (band.kind !== "swap") return null;
  return (
    <Badge
      variant="outline"
      // the rules note makes it long, so it may wrap on a phone rather than overflow
      className={cn(
        toneChip("progress"),
        "gap-1.5",
        throughRules > 0 && "h-auto py-0.5 text-start whitespace-normal",
      )}
    >
      <ArrowsLeftRightIcon aria-hidden />
      <span>
        <WithNumber render={(count) => m.trade_person_swap({ count })} count={band.swap} />
        {throughRules > 0 ? (
          <span className="font-normal">
            {" · "}
            {throughRules < band.swap
              ? m.trade_through_rules({ count: throughRules.toLocaleString(getLocale()) })
              : band.swap === 2
                ? m.trade_through_rules_both()
                : m.trade_through_rules_all()}
          </span>
        ) : null}
      </span>
    </Badge>
  );
}

/** Under a person's name: each direction's count. */
export function MatchCounts({ band }: { band: MatchBand }) {
  return (
    <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      {band.theyHave > 0 ? (
        <span className="flex items-center gap-1">
          <ArrowDownIcon aria-hidden className="size-3" />
          <span>
            <WithNumber
              render={(count) => m.trade_match_they_have({ count })}
              count={band.theyHave}
              className="text-foreground"
            />
          </span>
        </span>
      ) : null}
      {band.youHave > 0 ? (
        <span className="flex items-center gap-1">
          <ArrowUpIcon aria-hidden className="size-3" />
          <span>
            <WithNumber
              render={(count) => m.trade_match_you_have({ count })}
              count={band.youHave}
              className="text-foreground"
            />
          </span>
        </span>
      ) : null}
    </span>
  );
}
