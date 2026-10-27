import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  FlagIcon,
  MinusIcon,
  PaperPlaneTiltIcon,
  type Icon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { TRADE_EXPIRE_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import { useId, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { untilLabel } from "@/features/chat/format";
import { STEP_TONE, TONE_EDGE, TONE_FILL, TONE_INK, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useOfferActions } from "./actions";
import { itemLabel, leftLabel, shortDate, tradeStatusText } from "./format";
import { MakeOfferButton } from "./make-offer-button";
import { type Deadline, type Leg, type NextStep, type Note, tradeEnd } from "./next-step";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";
import { StatusBadge } from "./status-badge";
import { Feedback } from "./trade-feedback";
import { TradeSteps } from "./trade-steps";
import { AcceptCopy, Serial, rich } from "./wrong-copy";

const ICONS: Record<NextStep["kind"], Icon> = {
  completed: CheckIcon,
  failed: XIcon,
  cancelled: MinusIcon,
  youDecide: WarningIcon,
  yourTurn: PaperPlaneTiltIcon,
  stuck: WarningIcon,
  theyDecide: WarningIcon,
  theirTurn: ClockIcon,
};

function noteText(note: Note, name: string, objekt: string) {
  const date = note.leg.away ? untilLabel(note.leg.away.breaksAt) : "";
  switch (note.kind) {
    case "ownStuck":
      return m.offer_next_stuck({ objekt });
    case "theirStuck":
      return m.offer_next_their_stuck({ name, objekt });
    case "ownAway":
      return m.offer_next_away({ objekt, date });
    case "theirAway":
      return m.offer_next_their_away({ name, objekt, date });
  }
}

function chipText(trade: Trade, step: NextStep) {
  switch (step.kind) {
    case "yourTurn":
      return m.offer_chip_your_turn();
    case "theirTurn":
      return m.offer_chip_their_turn();
    case "youDecide":
      return m.offer_chip_you_decide();
    case "theyDecide":
      return m.offer_chip_they_decide();
    case "stuck":
      return m.offer_chip_stuck();
    default:
      return tradeStatusText(trade.status);
  }
}

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

/** Label over value, with a note under it; reads the viewer's clock, so only once hydrated. */
function deadlineParts(deadline: Deadline) {
  switch (deadline.kind) {
    case "ends":
      return {
        label: m.offer_deadline_ends(),
        value: m.offer_deadline_in({ left: leftLabel(deadline.at) }),
        note: shortDate(deadline.at),
      };
    case "endsHeld":
      return {
        label: m.offer_deadline_ends(),
        value: m.offer_deadline_paused(),
        note: m.offer_deadline_was({ date: shortDate(deadline.at) }),
      };
    case "decide":
      return {
        label: m.offer_deadline_decide(),
        value: m.offer_deadline_left({ left: leftLabel(deadline.at) }),
        note: shortDate(deadline.at),
      };
    case "copyLeft":
      return {
        label: m.offer_deadline_counts(),
        value: m.offer_deadline_in({ left: leftLabel(deadline.at) }),
        note: shortDate(deadline.at),
      };
    case "rateBy":
      return {
        label: m.offer_deadline_rate_by(),
        value: shortDate(deadline.at),
        note: m.offer_deadline_rate_note(),
      };
    case "rateUntil":
      return { label: m.offer_deadline_change_until(), value: shortDate(deadline.at), note: null };
    case "ended":
      return deadline.at
        ? { label: m.offer_deadline_ended(), value: shortDate(deadline.at), note: null }
        : null;
  }
}

type View = {
  title: ReactNode;
  body: ReactNode;
  /** under the body: the address to send to, the copies to compare, the rating */
  extra?: ReactNode;
  actions?: ReactNode;
};

/**
 * The trade's one status surface: its chip, title, body, deadline, the action its state names and
 * the stepper. The phone bar carries the state's primary action, so the card hides its own there.
 */
export function NextStepBanner({
  trade,
  step,
  collections,
  name,
  hydrated,
  needsYou,
  onCancel,
  onReport,
  onShowNeeds,
}: {
  trade: Trade;
  step: NextStep;
  collections: Collections;
  name: string;
  hydrated: boolean;
  /** legs the viewer can send plus different copies waiting on them */
  needsYou: number;
  onCancel: () => void;
  onReport: () => void;
  onShowNeeds: () => void;
}) {
  const titleId = useId();
  const tone: Tone = STEP_TONE[step.kind];
  const StepIcon = ICONS[step.kind];
  const label = (leg: Leg) => itemLabel(leg, collections);
  const { identity } = trade.partner;
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
        return {
          title: m.offer_next_cancelled(),
          body: endedText(trade, name),
          actions: (
            <MakeOfferButton
              label={m.offer_make_new()}
              request={{ to: { conversationId: trade.conversationId }, name }}
            />
          ),
        };
      case "youDecide": {
        const sent = <Serial serial={step.copy.serial} estimated={step.copy.serialEstimated} />;
        const asked = <Serial serial={step.leg.serial} estimated={step.leg.serialEstimated} />;
        return {
          title: rich(m.offer_wrong_copy_they_sent, { name, sent, asked }),
          body:
            step.copy.acceptBy && hydrated
              ? m.offer_wrong_copy_accept_by({ date: untilLabel(step.copy.acceptBy) })
              : null,
          extra: (
            <CompareCopies
              leg={step.leg}
              collections={collections}
              asked={asked}
              sent={sent}
              itemName={label(step.leg)}
            />
          ),
          actions: (
            <span className="contents max-sm:hidden">
              <DecideActions trade={trade} leg={step.leg} copyId={step.copy.id} />
            </span>
          ),
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
          extra: identity.address ? <SendTo identity={identity} /> : null,
          actions: step.canCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
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
  const deadline = hydrated ? deadlineParts(step.deadline) : null;
  const notes = "notes" in step ? step.notes : [];

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-xl border",
        tone === "neutral" ? "bg-card" : TONE_FILL[tone],
        TONE_EDGE[tone],
      )}
    >
      <div className="flex flex-wrap gap-4 p-4 sm:p-5">
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-lg",
            TONE_FILL[tone],
            TONE_INK[tone],
          )}
        >
          <StepIcon weight="bold" className="size-5.5" />
        </span>
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5">
          <StatusBadge tone={tone} className="self-start">
            {chipText(trade, step)}
          </StatusBadge>
          <h1
            id={titleId}
            className="text-lg leading-snug font-semibold text-pretty wrap-anywhere sm:text-xl"
          >
            {view.title}
          </h1>
          {view.body ? (
            <p className="text-muted-foreground text-sm text-pretty wrap-anywhere">{view.body}</p>
          ) : null}
          {notes.map((note) => (
            <p
              key={note.kind}
              className="text-warning-foreground flex items-start gap-1.5 text-xs text-pretty"
            >
              <WarningIcon aria-hidden weight="fill" className="mt-px size-3.5 shrink-0" />
              {noteText(note, name, label(note.leg))}
            </p>
          ))}
          {view.extra ? <div className="mt-2">{view.extra}</div> : null}
          {view.actions || needsYou > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {needsYou > 0 ? (
                <Button variant="outline" size="sm" onClick={onShowNeeds}>
                  {m.offer_show_needs_you({ count: needsYou })}
                </Button>
              ) : null}
              {view.actions}
            </div>
          ) : null}
        </div>
        {deadline ? (
          <div className="flex min-w-36 shrink-0 flex-col gap-0.5 sm:text-end">
            <span className="text-muted-foreground text-xs">{deadline.label}</span>
            <span className={cn("text-xl font-semibold tabular-nums", TONE_INK[tone])}>
              {deadline.value}
            </span>
            {deadline.note ? (
              <span className="text-muted-foreground max-w-52 text-xs sm:ms-auto">
                {deadline.note}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <TradeSteps
        trade={trade}
        kind={step.kind}
        hydrated={hydrated}
        className={cn("border-t px-4 pt-3.5 pb-4 sm:px-5", TONE_EDGE[tone])}
      />
    </section>
  );
}

/** Where to send in the Cosmo app: the default profile's nickname, then each other profile's. */
function SendTo({ identity }: { identity: Trade["partner"]["identity"] }) {
  const named = (profile: { address: string | null; nickname: string | null }) =>
    profile.nickname ?? (profile.address ? truncateAddress(profile.address) : "");
  const strong = (text: string) => <span className="font-medium">{text}</span>;
  return (
    <div className="bg-background/60 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5">
      <span className="text-muted-foreground text-xs">{m.offer_send_to()}</span>
      <span className="flex min-w-0 flex-1 basis-36 flex-col text-sm wrap-anywhere">
        <span>{rich(m.offer_send_in_cosmo, { name: strong(named(identity)) })}</span>
        {identity.also.map((profile) => (
          <span key={profile.address} className="text-muted-foreground">
            {rich(m.offer_send_or, { name: strong(named(profile)) })}
          </span>
        ))}
      </span>
    </div>
  );
}

function CompareCopies({
  leg,
  collections,
  asked,
  sent,
  itemName,
}: {
  leg: Leg;
  collections: Collections;
  asked: ReactNode;
  sent: ReactNode;
  itemName: string;
}) {
  const thumb = (className?: string) => (
    <OfferThumb
      slug={leg.collectionSlug}
      collection={collections[leg.collectionSlug]}
      className={cn("w-11", className)}
    />
  );
  return (
    <div className="flex items-center gap-3.5" aria-label={itemName} role="group">
      <div className="flex items-center gap-2.5">
        {thumb("opacity-55")}
        <span className="text-muted-foreground flex flex-col text-xs">
          {m.offer_copy_asked()}
          <span className="text-foreground font-mono text-sm">{asked}</span>
        </span>
      </div>
      <ArrowRightIcon
        aria-hidden
        className="text-muted-foreground size-4.5 shrink-0 rtl:rotate-180"
      />
      <div className="flex items-center gap-2.5">
        {thumb()}
        <span className="text-muted-foreground flex flex-col text-xs">
          {m.offer_copy_sent()}
          <span className="text-warning-foreground font-mono text-sm font-semibold">{sent}</span>
        </span>
      </div>
    </div>
  );
}

/** Decline and Accept for the copy the card shows; the phone bar renders its own pair. */
export function DecideActions({
  trade,
  leg,
  copyId,
  size = "sm",
}: {
  trade: Trade;
  leg: Leg;
  copyId: number;
  size?: ButtonProps["size"];
}) {
  const actions = useOfferActions(trade.conversationId, () => "");
  const sub = leg.substitutes.find((copy) => copy.id === copyId)!;
  const bar = size !== "sm";
  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={bar ? "shrink-0 px-3 text-base" : undefined}
        loading={actions.declineSubstitute.isPending}
        onClick={() => actions.declineSubstitute.mutate({ substituteId: sub.id })}
      >
        {m.offer_wrong_copy_decline()}
      </Button>
      <AcceptCopy
        sub={sub}
        leg={leg}
        actions={actions}
        size={size}
        className={bar ? "min-w-0 flex-1 px-3 text-base" : undefined}
      />
    </>
  );
}
