import type { TradeView } from "@repo/api/schemas/offer";
import type { ReactNode } from "react";

import { untilLabel } from "@/features/chat/format";
import { TONE_BAR, TONE_INK, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The Transfers step by outcome; a cancelled trade leaves it unmarked. */
const TRANSFERS: Record<TradeView["status"], Tone> = {
  in_progress: "progress",
  completed: "success",
  failed: "destructive",
  cancelled: "neutral",
};

/** Proposed, Accepted, Transfers and Complete. */
export function TradeSteps({
  trade,
  completed,
  hydrated,
}: {
  trade: TradeView;
  completed: boolean;
  hydrated: boolean;
}) {
  // in the viewer's zone, unknown to the server render
  const time = (at: string) => (hydrated ? <time dateTime={at}>{untilLabel(at)}</time> : null);

  const steps: { key: string; label: string; detail: ReactNode; tone: Tone }[] = [
    {
      key: "proposed",
      label: m.offer_trade_proposed(),
      detail: time(trade.proposedAt),
      tone: "success",
    },
    {
      key: "accepted",
      label: m.offer_trade_accepted(),
      detail: time(trade.acceptedAt),
      tone: "success",
    },
    {
      key: "transfers",
      label: m.offer_trade_step_transfers(),
      detail: m.offer_trade_step_progress(trade.progress),
      tone: TRANSFERS[trade.status],
    },
    {
      key: "complete",
      label: m.offer_trade_step_complete(),
      detail: completed && trade.endedAt ? time(trade.endedAt) : "—",
      tone: completed ? "success" : "neutral",
    },
  ];

  return (
    <ol
      aria-label={m.offer_trade_steps_label()}
      className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4"
    >
      {steps.map((step) => (
        <li
          key={step.key}
          aria-current={step.tone === "progress" ? "step" : undefined}
          className={cn("flex flex-col gap-0.5 border-t-3 pt-2", TONE_BAR[step.tone])}
        >
          <span className={cn("min-h-4 font-mono text-xs tabular-nums", TONE_INK[step.tone])}>
            {step.detail}
          </span>
          <span className="text-sm font-medium">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
