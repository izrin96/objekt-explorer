import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One line where the card is wide enough (byline, sides, actions, with `below` under the
 * sides), stacked in that order where it is not. The card is the container, so the layout
 * follows the feed's width rather than the viewport's. `panel` spans the full width.
 */
export function TradeRow({
  byline,
  sides,
  actions,
  below,
  panel,
  id,
  className,
}: {
  byline: ReactNode;
  sides: ReactNode;
  actions?: ReactNode;
  below?: ReactNode;
  panel?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <article id={id} className={cn("bg-card @container rounded-lg border", className)}>
      <div className="grid gap-x-4 gap-y-3 p-4 @3xl:grid-cols-[13rem_minmax(0,1fr)_auto]">
        <div className="min-w-0 @3xl:row-span-2">{byline}</div>
        <div className="min-w-0 @3xl:col-start-2">{sides}</div>
        {below ? <div className="min-w-0 @3xl:col-start-2 @3xl:row-start-2">{below}</div> : null}
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 @3xl:col-start-3 @3xl:row-start-1 @3xl:self-start">
            {actions}
          </div>
        ) : null}
        {panel}
      </div>
    </article>
  );
}

/** One strip across the whole width, or two sharing it with a ⇄ between them. */
export function TradeSides({ strips }: { strips: readonly ReactNode[] }) {
  const [first, second] = strips;
  if (!second) return <>{first}</>;

  return (
    <div className="grid grid-cols-1 items-start gap-2 @3xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {first}
      <ArrowsLeftRightIcon
        aria-hidden
        className="text-muted-foreground size-4 shrink-0 rotate-90 self-center justify-self-center @3xl:rotate-0"
      />
      {second}
    </div>
  );
}
