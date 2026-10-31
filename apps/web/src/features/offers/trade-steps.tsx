import type { TradeView } from "@repo/api/schemas/offer";
import { useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TONE_INK, TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { shortDate } from "./format";
import type { StepKind } from "./next-step";

/** A step is done (neutral grey), todo, or coloured by a tone. */
type Mark = "done" | "todo" | Tone;

/** The marks of Proposed, Accepted, Transfers and Complete, and the step reached last. */
function marks(status: TradeView["status"], kind: StepKind) {
  switch (status) {
    case "in_progress": {
      const transfers = kind === "youDecide" || kind === "theyDecide" ? "warning" : "progress";
      return { marks: ["done", "done", transfers, "todo"] as Mark[], current: 2 };
    }
    case "completed":
      return { marks: ["success", "success", "success", "success"] as Mark[], current: 3 };
    case "failed":
      return { marks: ["done", "done", "destructive", "todo"] as Mark[], current: 2 };
    case "cancelled":
      return { marks: ["done", "done", "todo", "todo"] as Mark[], current: 1 };
  }
}

const segment = (mark: Mark) =>
  mark === "done" ? "bg-muted-foreground" : mark === "todo" ? "bg-border" : TONE_SOLID[mark];

/** Proposed, Accepted, Transfers and Complete, along the foot of the status card. */
export function TradeSteps({
  trade,
  kind,
  className,
}: {
  trade: TradeView;
  kind: StepKind;
  className?: string;
}) {
  const hydrated = useHydrated();
  // in the viewer's zone, unknown to the server render
  const time = (at: string) => (hydrated ? <time dateTime={at}>{shortDate(at)}</time> : null);
  const { marks: list, current } = marks(trade.status, kind);
  const live = trade.status === "in_progress";

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

  return (
    <ol
      aria-label={m.offer_trade_steps_label()}
      className={cn("grid grid-cols-4 gap-1.5 sm:gap-3", className)}
    >
      {steps.map((step, index) => {
        const mark = list[index]!;
        const toned = mark !== "done" && mark !== "todo";
        const isCurrent = index === current && live;
        // the failed step is neither done nor still to come
        const state =
          mark === "todo"
            ? m.offer_step_not_yet()
            : isCurrent || mark === "destructive"
              ? null
              : m.offer_step_done();
        return (
          <li
            key={step.key}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-col gap-1.5"
          >
            <span aria-hidden className={cn("h-1.5 rounded-full", segment(mark))} />
            <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
              <span
                className={cn(
                  "font-medium",
                  index === current && toned
                    ? cn("font-semibold", TONE_INK[mark])
                    : mark === "todo"
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {step.label}
              </span>
              {state ? <span className="sr-only">{state}</span> : null}
              <span
                aria-live={step.key === "transfers" ? "polite" : undefined}
                className="text-muted-foreground tabular-nums"
              >
                {step.detail}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
