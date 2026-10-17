import {
  CheckIcon,
  ClockCountdownIcon,
  ClockIcon,
  FlagIcon,
  MinusIcon,
  PaperPlaneTiltIcon,
  type Icon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { TRADE_EXPIRE_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { untilLabel } from "@/features/chat/format";
import { TONE_EDGE, TONE_FILL, TONE_INK, TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import { itemLabel, leftLabel, shortDate } from "./format";
import { type Deadline, type Leg, type NextStep, nextStep, tradeEnd } from "./next-step";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";
import { Feedback } from "./trade-feedback";
import { AcceptCopy, Serial, rich } from "./wrong-copy";

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
const readStep = (trade: Trade) => nextStep(trade, Date.now());

const TONES: Record<NextStep["kind"], { tone: Tone; icon: Icon }> = {
  completed: { tone: "success", icon: CheckIcon },
  failed: { tone: "destructive", icon: XIcon },
  cancelled: { tone: "neutral", icon: MinusIcon },
  youDecide: { tone: "warning", icon: WarningIcon },
  yourTurn: { tone: "progress", icon: PaperPlaneTiltIcon },
  stuck: { tone: "warning", icon: WarningIcon },
  theyDecide: { tone: "warning", icon: WarningIcon },
  theirTurn: { tone: "progress", icon: ClockIcon },
};

function endedText(trade: Trade, name: string) {
  if (trade.status === "failed") {
    return trade.cancelReason === "expired"
      ? m.offer_trade_failed_expired_desc({ days: TRADE_EXPIRE_DAYS })
      : m.offer_trade_failed_desc();
  }
  if (trade.cancelReason === "token_moved") return m.offer_trade_cancelled_moved();
  if (trade.cancelReason === "not_transferable") {
    return m.offer_trade_cancelled_not_transferable();
  }
  if (trade.cancelReason === "expired") {
    return m.offer_trade_cancelled_expired({ days: TRADE_EXPIRE_DAYS });
  }
  return trade.cancelledByYou
    ? m.offer_trade_cancelled_by_you()
    : m.offer_trade_cancelled_by_them({ name });
}

function deadlineText(deadline: Deadline) {
  switch (deadline.kind) {
    case "ends":
      return m.offer_next_ends({ left: leftLabel(deadline.at), date: shortDate(deadline.at) });
    case "endsHeld":
      return m.offer_next_ends_due();
    case "decide":
      return m.offer_next_decide_left({ left: leftLabel(deadline.at) });
    case "copyLeft":
      return m.offer_next_left({ left: leftLabel(deadline.at) });
    case "rateUntil":
      return m.offer_next_rate_until({ date: shortDate(deadline.at) });
    case "ended":
      return deadline.at ? m.offer_next_ended({ date: shortDate(deadline.at) }) : null;
  }
}

type View = {
  title: ReactNode;
  body: ReactNode;
  /** under the body */
  extra?: ReactNode;
  /** the buttons of the right column */
  actions?: ReactNode;
};

/** The one next step of a trade, with its tone, copy, deadline and action. */
export function NextStepBanner({
  trade,
  collections,
  name,
  hydrated,
  onCancel,
  onReport,
}: {
  trade: Trade;
  collections: Collections;
  name: string;
  hydrated: boolean;
  onCancel: () => void;
  onReport: () => void;
}) {
  const titleId = useId();
  const step = readStep(trade);
  const { tone, icon: StepIcon } = TONES[step.kind];
  const label = (leg: Leg) => itemLabel(leg, collections);
  const reportButton = (
    <Button variant="outline" size="sm" onClick={onReport}>
      <FlagIcon />
      {m.offer_report_problem()}
    </Button>
  );

  const view = ((): View => {
    switch (step.kind) {
      case "completed":
        return step.canRate
          ? {
              title: m.offer_next_completed(),
              body: m.offer_rating_private(),
              extra: <Feedback trade={trade} name={name} />,
            }
          : { title: m.offer_next_completed_closed(), body: m.offer_rating_closed() };
      case "failed":
        return {
          title: m.offer_next_failed(),
          body: endedText(trade, name),
          extra: step.canRate ? <Feedback trade={trade} name={name} /> : null,
          actions: step.canReport ? reportButton : null,
        };
      case "cancelled":
        return { title: m.offer_next_cancelled(), body: endedText(trade, name) };
      case "youDecide": {
        const sent = <Serial serial={step.copy.serial} estimated={step.copy.serialEstimated} />;
        const asked = <Serial serial={step.leg.serial} estimated={step.leg.serialEstimated} />;
        return {
          title: rich(m.offer_wrong_copy_they_sent, { name, sent, asked }),
          body: (
            <span className="flex items-center gap-2">
              <OfferThumb
                slug={step.leg.collectionSlug}
                collection={collections[step.leg.collectionSlug]}
                className="w-9"
              />
              {step.copy.acceptBy && hydrated
                ? m.offer_wrong_copy_accept_by({ date: untilLabel(step.copy.acceptBy) })
                : null}
            </span>
          ),
          actions: <DecideActions trade={trade} leg={step.leg} copyId={step.copy.id} />,
        };
      }
      case "yourTurn": {
        const first = {
          send: m.offer_next_send_body(),
          firstYou: `${m.offer_first_you()} ${m.offer_next_suggestion()}`,
          firstThem: `${m.offer_first_them({ name })} ${m.offer_next_suggestion()}`,
          firstThemSent: `${m.offer_first_them({ name })} ${m.offer_first_them_sent({ name })}`,
        };
        const [only] = step.legs;
        return {
          title: m.offer_next_your_turn({
            objekts:
              step.legs.length === 1 && only
                ? label(only)
                : m.offer_next_objekts_multiple({ count: step.legs.length }),
            name,
          }),
          body: first[step.body],
          actions: step.canCancel ? (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {m.offer_trade_cancel()}
            </Button>
          ) : null,
        };
      }
      case "stuck":
        return {
          title: m.offer_next_stuck({ objekt: label(step.leg) }),
          body: hydrated
            ? m.offer_next_stuck_body({ date: shortDate(new Date(tradeEnd(trade)).toISOString()) })
            : null,
        };
      case "theyDecide": {
        const sent = <Serial serial={step.copy.serial} estimated={step.copy.serialEstimated} />;
        const asked = <Serial serial={step.leg.serial} estimated={step.leg.serialEstimated} />;
        return {
          title: rich(m.offer_wrong_copy_you_sent, { sent, asked }),
          body: (
            <>
              {rich(m.offer_wrong_copy_giver_hint, { name, asked })}
              {step.copy.acceptBy && hydrated ? (
                <>
                  {" "}
                  {m.offer_wrong_copy_accept_by_giver({
                    name,
                    date: untilLabel(step.copy.acceptBy),
                  })}
                </>
              ) : null}
            </>
          ),
        };
      }
      case "theirTurn":
        return {
          title: m.offer_next_their_turn({ name }),
          body: m.offer_next_nothing_to_do(),
          actions: step.canReport ? reportButton : null,
        };
    }
  })();

  // the viewer's own clock, so the deadline waits for the client
  const deadline = hydrated ? deadlineText(step.deadline) : null;
  const notes = "notes" in step ? step.notes : [];

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl border p-4",
        TONE_FILL[tone],
        TONE_EDGE[tone],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg text-white",
          TONE_SOLID[tone],
        )}
      >
        <StepIcon weight="fill" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
        <h3 id={titleId} className="text-sm font-semibold text-pretty wrap-anywhere">
          {view.title}
        </h3>
        <div className="text-sm text-pretty wrap-anywhere">{view.body}</div>
        {notes.map((note) => (
          <p
            key={note.kind}
            className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty"
          >
            {note.kind === "indexerBehind" ? (
              <>
                <ClockCountdownIcon aria-hidden className="mt-px size-3.5 shrink-0" />
                {trade.seenUntil && hydrated
                  ? m.offer_indexer_behind({ time: untilLabel(trade.seenUntil) })
                  : m.offer_indexer_behind_unknown()}
              </>
            ) : (
              <>
                <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
                {note.kind === "ownStuck"
                  ? m.offer_next_stuck({ objekt: label(note.leg) })
                  : m.offer_next_their_stuck({ name, objekt: label(note.leg) })}
              </>
            )}
          </p>
        ))}
        {view.extra ? <div className="mt-1">{view.extra}</div> : null}
      </div>
      {deadline || view.actions ? (
        <div className="flex flex-col items-end gap-2 max-sm:w-full max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:justify-between">
          {deadline ? (
            <p className={cn("text-xs font-medium tabular-nums", TONE_INK[tone])}>{deadline}</p>
          ) : null}
          {view.actions ? (
            <div className="flex flex-wrap justify-end gap-2">{view.actions}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DecideActions({ trade, leg, copyId }: { trade: Trade; leg: Leg; copyId: number }) {
  const actions = useOfferActions(trade.conversationId, () => "");
  const sub = leg.substitutes.find((copy) => copy.id === copyId)!;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        loading={actions.declineSubstitute.isPending}
        onClick={() => actions.declineSubstitute.mutate({ substituteId: sub.id })}
      >
        {m.offer_wrong_copy_decline()}
      </Button>
      <AcceptCopy sub={sub} leg={leg} actions={actions} />
    </>
  );
}
