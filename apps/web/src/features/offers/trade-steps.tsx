import type { TradeView } from "@repo/api/schemas/offer";
import type { ReactNode } from "react";

import { TONE_FILL, TONE_INK, TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { shortDate } from "./format";

/** A step is done (neutral dark), todo, or coloured by a tone. */
type Mark = "done" | "todo" | Tone;

/** The marks of Proposed, Accepted, Transfers and Complete, and the step the phone chip names. */
const MARKS: Record<TradeView["status"], { marks: [Mark, Mark, Mark, Mark]; current: number }> = {
  in_progress: { marks: ["done", "done", "progress", "todo"], current: 2 },
  completed: { marks: ["success", "success", "success", "success"], current: 3 },
  failed: { marks: ["done", "done", "destructive", "todo"], current: 2 },
  cancelled: { marks: ["done", "done", "todo", "todo"], current: 1 },
};

const SEGMENT = {
  done: "bg-muted-foreground",
  todo: "bg-border",
} as const;

const segment = (mark: Mark) =>
  mark === "done" || mark === "todo" ? SEGMENT[mark] : TONE_SOLID[mark];
const ink = (mark: Mark) =>
  mark === "done" || mark === "todo" ? "text-foreground" : TONE_INK[mark];

/** Proposed, Accepted, Transfers and Complete. */
export function TradeSteps({ trade, hydrated }: { trade: TradeView; hydrated: boolean }) {
  // in the viewer's zone, unknown to the server render
  const time = (at: string) => (hydrated ? <time dateTime={at}>{shortDate(at)}</time> : null);
  const { marks, current } = MARKS[trade.status];

  const steps: { key: string; label: string; detail: ReactNode }[] = [
    { key: "proposed", label: m.offer_trade_proposed(), detail: time(trade.proposedAt) },
    { key: "accepted", label: m.offer_trade_accepted(), detail: time(trade.acceptedAt) },
    {
      key: "transfers",
      label: m.offer_trade_step_transfers(),
      detail: m.offer_trade_step_progress(trade.progress),
    },
    {
      key: "complete",
      label: m.offer_trade_step_complete(),
      detail: trade.status === "completed" && trade.endedAt ? time(trade.endedAt) : null,
    },
  ];
  const shown = steps[current]!;
  const shownMark = marks[current]!;

  return (
    <div className="flex items-center gap-3">
      <ol
        aria-label={m.offer_trade_steps_label()}
        className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 sm:gap-3"
      >
        {steps.map((step, index) => {
          const mark = marks[index]!;
          return (
            <li
              key={step.key}
              aria-current={
                index === current && trade.status === "in_progress" ? "step" : undefined
              }
              className="flex min-w-0 flex-col gap-1.5"
            >
              <span aria-hidden className={cn("h-1.5 rounded-full", segment(mark))} />
              <span className="flex items-baseline gap-1.5 text-xs max-sm:sr-only">
                <span
                  className={cn(
                    "font-medium",
                    index === current && mark !== "done" && mark !== "todo"
                      ? cn("rounded-md px-1.5 py-0.5", TONE_FILL[mark], ink(mark))
                      : mark === "todo"
                        ? "text-muted-foreground"
                        : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span
                  // the "n of m" that updates live; below `sm` it is read, not shown
                  aria-live={step.key === "transfers" ? "polite" : undefined}
                  className="text-muted-foreground truncate font-mono tabular-nums"
                >
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {/* the list above already reads each step below `sm` */}
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-baseline gap-1.5 rounded-md px-1.5 py-0.5 text-xs sm:hidden",
          shownMark === "done" || shownMark === "todo"
            ? "bg-muted text-foreground"
            : cn(TONE_FILL[shownMark], ink(shownMark)),
        )}
      >
        <span className="font-medium">{shown.label}</span>
        {current === 2 ? <span className="font-mono tabular-nums">{shown.detail}</span> : null}
      </span>
    </div>
  );
}
