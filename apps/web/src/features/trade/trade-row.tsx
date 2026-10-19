import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

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
