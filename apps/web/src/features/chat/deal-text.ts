import type { Deal, DealState } from "@repo/api/schemas/chat-deal";

import { stepChipText } from "@/features/offers/next-step-text";
import { STEP_TONE, type Tone } from "@/lib/tone";
import { m } from "@/paraglide/messages";

/** A failed trade asks for a rating here rather than reporting a loss, so it is warning, not destructive. */
export function dealTone(state: DealState): Tone {
  switch (state) {
    case "waitingYou":
      return "warning";
    case "waitingThem":
      return "neutral";
    case "failed":
      return "warning";
    default:
      return STEP_TONE[state];
  }
}

/** `offerNo` and `tradeNo`'s form; `offers/format.ts` reaches the network, so this module can't import it. */
export const dealNo = (deal: Deal) => `${deal.kind === "offer" ? "O" : "T"}-${deal.id}`;

/** How the strip writes time left ("3 days") and a date ("Oct 30"): `leftLabel` and `shortDate`. */
export type StripFormat = { left: (iso: string) => string; date: (iso: string) => string };

const progress = (deal: Deal) =>
  deal.verified === null || deal.total === null
    ? null
    : m.offer_trade_step_progress({ verified: deal.verified, total: deal.total });

/** The row's line after the number: `words` truncate, `trailing` stays whole. */
export function rowText(deal: Deal): { words: string; trailing: string | null } {
  switch (deal.state) {
    case "waitingYou":
      return { words: m.offer_status_waiting_you(), trailing: null };
    case "waitingThem":
      return { words: m.offer_status_waiting_them(), trailing: null };
    case "youDecide":
      return { words: m.chat_deal_row_you_decide(), trailing: null };
    case "yourTurn":
      return {
        words: m.chat_deal_row_your_turn(),
        trailing: m.chat_deal_row_send({ count: deal.count ?? 0 }),
      };
    case "theirTurn":
      return { words: m.offer_status_waiting_them(), trailing: progress(deal) };
    case "stuck":
      return { words: m.chat_deal_row_stuck(), trailing: progress(deal) };
    case "theyDecide":
      return { words: m.chat_deal_row_they_decide(), trailing: null };
    case "completed":
      return { words: m.chat_deal_row_completed(), trailing: null };
    case "failed":
      return { words: m.chat_deal_row_failed(), trailing: null };
  }
}

export type StripAction = "review" | "view" | "openTrade" | "rate" | "makeOffer";

export type StripText = {
  /** null when there is no deal */
  no: string | null;
  words: string;
  trailing: string | null;
  second: string | null;
  action: StripAction;
  tone: Tone;
};

/** The thread's strip: the deal's line, its second line and its one action. */
export function stripText(
  deal: Deal | null,
  hadOffer: boolean,
  name: string,
  format: StripFormat,
): StripText {
  if (deal === null) {
    return {
      no: null,
      words: hadOffer ? m.chat_deal_none_open() : m.chat_deal_none_yet(),
      trailing: null,
      second: null,
      action: "makeOffer",
      tone: "neutral",
    };
  }
  const base = { no: dealNo(deal), tone: dealTone(deal.state), trailing: null };
  const expires = deal.until ? m.chat_deal_expires({ time: format.left(deal.until) }) : null;
  switch (deal.state) {
    case "waitingYou":
      return {
        ...base,
        words: m.offer_status_waiting_you(),
        second: deal.until ? m.chat_deal_offer_from({ name, time: format.left(deal.until) }) : null,
        action: "review",
      };
    case "waitingThem":
      return { ...base, words: m.offer_status_waiting_them(), second: expires, action: "view" };
    case "completed":
    case "failed":
      return {
        ...base,
        words: stepChipText(deal.state),
        second: deal.until ? m.chat_deal_rate_by({ name, date: format.date(deal.until) }) : null,
        action: "rate",
      };
    default: {
      const count = deal.count ?? 0;
      return {
        ...base,
        words: stepChipText(deal.state),
        trailing: progress(deal),
        second:
          deal.state === "yourTurn"
            ? count === 1
              ? m.chat_deal_send_one({ name })
              : m.chat_deal_send({ count, name })
            : deal.state === "theirTurn"
              ? m.offer_next_their_turn({ name })
              : null,
        action: "openTrade",
      };
    }
  }
}
