import { XIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type ReactNode, useRef } from "react";

import { FadeScrollArea } from "@/components/shared/fade-scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { formatCount } from "@/lib/number";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { tickedName } from "./ticked-name";

export type Ticked = ReadonlyMap<string, ValidObjekt>;

/** The Ticked heading, count and Clear over the ticked cards; beside the grid, or in the bar's popover. */
export function TickedTray({
  ticked,
  onUntick,
  onClear,
  scrollClassName,
  listClassName,
  action,
}: {
  ticked: Ticked;
  onUntick: (key: string, objekt: ValidObjekt) => void;
  onClear: () => void;
  /** sizes the scroll area: it fills a column, or stops at a height in the popover */
  scrollClassName: string;
  listClassName: string;
  /** a control of the caller's, drawn before Clear */
  action?: ReactNode;
}) {
  // where focus lands when the control holding it leaves the tray
  const heading = useRef<HTMLSpanElement>(null);
  const count = ticked.size;
  return (
    <>
      {/* wraps: ko and ja labels outgrow the 16rem column, and squeezed CJK breaks per character */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          ref={heading}
          tabIndex={-1}
          className="text-sm font-medium whitespace-nowrap outline-none"
        >
          {m.trade_composer_add_ticked()}
        </span>
        <Badge variant="outline">{formatCount(count)}</Badge>
        <div className="ms-auto flex items-center">
          {action}
          <Button
            variant="ghost"
            size="xs"
            disabled={count === 0}
            onClick={() => {
              heading.current?.focus();
              onClear();
            }}
          >
            {m.trade_composer_add_clear()}
          </Button>
        </div>
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground text-xs text-pretty">
          {m.trade_composer_add_tray_empty()}
        </p>
      ) : (
        <TickedList
          ticked={ticked}
          onUntick={onUntick}
          onEmptied={() => heading.current?.focus()}
          scrollClassName={scrollClassName}
          className={listClassName}
        />
      )}
    </>
  );
}

function TickedList({
  ticked,
  onUntick,
  onEmptied,
  scrollClassName,
  className,
}: {
  ticked: Ticked;
  onUntick: (key: string, objekt: ValidObjekt) => void;
  onEmptied: () => void;
  scrollClassName: string;
  className: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  // the pressed button leaves with its card, so focus moves to a neighbour that stays
  const untick = (index: number, key: string, objekt: ValidObjekt) => {
    const buttons = listRef.current?.querySelectorAll("button") ?? [];
    const next = buttons[index + 1] ?? buttons[index - 1];
    if (next) next.focus();
    else onEmptied();
    onUntick(key, objekt);
  };
  return (
    <FadeScrollArea className={scrollClassName}>
      <ul
        ref={listRef} // clear of the scrollbar, which takes clicks even while hidden
        className={cn("grid content-start gap-1.5 pe-2.5", className)}
      >
        {[...ticked].map(([key, objekt], index) => (
          <li key={key} className="relative min-w-0">
            <ObjektCard objekt={objekt} image="thumbnail" hideLabel />
            <button
              type="button"
              aria-label={m.trade_composer_add_untick({ name: tickedName(objekt) })}
              onClick={() => untick(index, key, objekt)}
              className="bg-background hover:bg-muted focus-visible:ring-ring absolute end-0.5 top-0.5 z-10 grid size-6 place-items-center rounded-full border shadow-xs outline-none focus-visible:ring-2"
            >
              <XIcon className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    </FadeScrollArea>
  );
}
