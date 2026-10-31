import { TRADE_EXPIRE_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";

import { joinSentences } from "@/lib/text";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { Deadline, Leg, NextStep, Note, StepKind } from "./next-step";

/**
 * How the card writes time left ("3 days"), a date ("Oct 30") and an until-date: `leftLabel`,
 * `shortDate` and `untilLabel`. Those reach the network, so this module can't import them.
 */
export type CardFormat = {
  left: (iso: string) => string;
  date: (iso: string) => string;
  until: (iso: string) => string;
};

export function noteText(
  note: Note,
  i: { name: string; objekt: string; until: CardFormat["until"] },
) {
  const { name, objekt } = i;
  const date = () => (note.leg.away ? i.until(note.leg.away.breaksAt) : "");
  switch (note.kind) {
    case "ownStuck":
      return m.offer_next_stuck({ objekt });
    case "theirStuck":
      return m.offer_next_their_stuck({ name, objekt });
    case "ownAway":
      return m.offer_next_away({ objekt, date: date() });
    case "theirAway":
      return m.offer_next_their_away({ name, objekt, date: date() });
  }
}

/** `cancelledByYou: null` reads as "by them". */
export function endedText(
  t: Pick<Trade, "status" | "cancelReason" | "cancelledByYou">,
  name: string,
) {
  if (t.status === "failed") {
    return t.cancelReason === "expired"
      ? m.offer_trade_failed_expired_desc({ days: TRADE_EXPIRE_DAYS })
      : m.offer_trade_failed_desc();
  }
  if (t.cancelReason === "token_moved") return m.offer_trade_cancelled_moved();
  if (t.cancelReason === "not_transferable") return m.offer_trade_cancelled_not_transferable();
  if (t.cancelReason === "expired") {
    return m.offer_trade_cancelled_expired({ days: TRADE_EXPIRE_DAYS });
  }
  return t.cancelledByYou
    ? m.offer_trade_cancelled_by_you()
    : m.offer_trade_cancelled_by_them({ name });
}

/** Label over value, with a note under it. */
export function deadlineText(d: Deadline, f: Pick<CardFormat, "left" | "date">) {
  switch (d.kind) {
    case "ends":
      return {
        label: m.offer_deadline_ends(),
        value: m.offer_deadline_in({ left: f.left(d.at) }),
        note: f.date(d.at),
      };
    case "endsHeld":
      return {
        label: m.offer_deadline_ends(),
        value: m.offer_deadline_paused(),
        note: m.offer_deadline_was({ date: f.date(d.at) }),
      };
    case "decide":
      return {
        label: m.offer_deadline_decide(),
        value: m.offer_deadline_left({ left: f.left(d.at) }),
        note: f.date(d.at),
      };
    case "copyLeft":
      return {
        label: m.offer_deadline_counts(),
        value: m.offer_deadline_in({ left: f.left(d.at) }),
        note: f.date(d.at),
      };
    case "rateBy":
      return {
        label: m.offer_deadline_rate_by(),
        value: f.date(d.at),
        note: m.offer_deadline_rate_note(),
      };
    case "rateUntil":
      return { label: m.offer_deadline_change_until(), value: f.date(d.at), note: null };
    case "ended":
      return d.at ? { label: m.offer_deadline_ended(), value: f.date(d.at), note: null } : null;
  }
}

function sendBody(step: Extract<NextStep, { kind: "yourTurn" }>, name: string) {
  switch (step.body) {
    case "send":
      return m.offer_next_send_body();
    case "firstYou":
      return joinSentences([m.offer_first_you(), m.offer_next_suggestion()]);
    case "firstThem":
      return joinSentences([m.offer_first_them({ name }), m.offer_next_suggestion()]);
    case "firstThemSent":
      return joinSentences([m.offer_first_them({ name }), m.offer_first_them_sent({ name })]);
  }
}

/** One leg names its objekt in the title; more give a count. */
export function yourTurnText(
  step: Extract<NextStep, { kind: "yourTurn" }>,
  name: string,
  nameOf: (leg: Leg) => string,
) {
  const [only] = step.legs;
  return {
    title: m.offer_next_your_turn({
      objekts:
        step.legs.length === 1 && only
          ? nameOf(only)
          : m.offer_next_objekts_multiple({ count: step.legs.length.toLocaleString(getLocale()) }),
      name,
    }),
    body: sendBody(step, name),
  };
}

/** The chip's words, which the chat strip shares. The last three match `tradeStatusText`. */
export function stepChipText(kind: StepKind) {
  switch (kind) {
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
    case "completed":
      return m.offer_trade_completed();
    case "failed":
      return m.offer_trade_failed();
    case "cancelled":
      return m.offer_trade_cancelled();
  }
}
