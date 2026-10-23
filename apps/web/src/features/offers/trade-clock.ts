import {
  REMIND_AFTER_HOURS,
  REPORT_AFTER_DAYS,
  type TradeView as Trade,
} from "@repo/api/schemas/offer";

import { bothGive, type Copy, type Leg, nextStep, stepKind, tradeEnd } from "./next-step";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** `paused`: an expiry past due that waits for the indexer to catch up. */
type When = "past" | "today" | "future" | "paused";

type Outcome = "completed" | "failed" | "cancelled";

export type TimelineRow =
  | { kind: "proposed"; at: string; when: When }
  | { kind: "accepted"; at: string; when: When }
  | { kind: "sent"; at: string | null; when: When; leg: Leg; txHash: string | null }
  | { kind: "copyArrived"; at: string; when: When; leg: Leg; copy: Copy; txHash: string }
  | { kind: "copyDue"; at: string; when: When; leg: Leg; copy: Copy }
  | { kind: "reminder"; at: string; when: When }
  | { kind: "report"; at: string; when: When }
  | { kind: "today"; at: string; when: "today" }
  | { kind: "ends"; at: string; when: When; outcome: Outcome }
  /** undated, always last while in progress */
  | { kind: "rate"; at: null; when: "future" }
  | { kind: "end"; at: string | null; when: "past"; outcome: Outcome }
  | { kind: "rateCloses"; at: string; when: When };

/** Rows at the same instant keep this order. */
const ORDER: TimelineRow["kind"][] = [
  "proposed",
  "accepted",
  "sent",
  "copyArrived",
  "copyDue",
  "reminder",
  "report",
  "ends",
  "today",
  "end",
  "rateCloses",
  "rate",
];

/** The copy the worker accepts on a leg at expiry: its earliest pending one. */
function firstPendingCopy(copies: Copy[]) {
  return (
    copies
      .filter((copy) => copy.status === "pending")
      .toSorted((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id - b.id)[0] ?? null
  );
}

/**
 * What an unfinished trade ends as at its expiry. The worker first accepts each waiting leg's
 * pending wrong copy, so a copy on every waiting leg completes it; otherwise a verified leg or a
 * held copy makes it failed.
 */
export function expiryOutcome(trade: Pick<Trade, "progress" | "legs">) {
  const waiting = trade.legs.filter((leg) => leg.state === "waiting");
  const picked = waiting.map((leg) => firstPendingCopy(leg.substitutes));
  // one transfer pending on two legs settles only the first, so the trade fails
  const keys = new Set(picked.map((copy) => copy && `${copy.txHash}:${copy.objektId}`));
  if (waiting.length > 0 && !keys.has(null) && keys.size === waiting.length) {
    return "completed" as const;
  }
  return trade.progress.verified > 0 || trade.legs.some((leg) => leg.substitutes.length > 0)
    ? ("failed" as const)
    : ("cancelled" as const);
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (at: string | null) => (at ? new Date(at).getTime() : 0);

/**
 * Every event of a trade in time order, with `now` (ms) among them while it is in progress, then
 * what lies ahead; once it ended, how it ended and when rating closes.
 */
export function timelineRows(trade: Trade, now: number): TimelineRow[] {
  const when = (at: string): When => (ms(at) <= now ? "past" : "future");
  const live = trade.status === "in_progress";
  const rows: TimelineRow[] = [
    { kind: "proposed", at: trade.proposedAt, when: when(trade.proposedAt) },
    { kind: "accepted", at: trade.acceptedAt, when: when(trade.acceptedAt) },
  ];
  for (const leg of trade.legs) {
    if (leg.state === "verified") {
      const at = leg.verifiedAt;
      rows.push({ kind: "sent", at, when: at ? when(at) : "past", leg, txHash: leg.txHash });
    }
    for (const copy of leg.substitutes) {
      rows.push({
        kind: "copyArrived",
        at: copy.at,
        when: when(copy.at),
        leg,
        copy,
        txHash: copy.txHash,
      });
      if (live && copy.status === "pending" && copy.acceptBy) {
        rows.push({ kind: "copyDue", at: copy.acceptBy, when: when(copy.acceptBy), leg, copy });
      }
    }
  }
  if (live) {
    const accepted = ms(trade.acceptedAt);
    const reminder = iso(accepted + REMIND_AFTER_HOURS * HOUR_MS);
    const report = iso(accepted + REPORT_AFTER_DAYS * DAY_MS);
    const ends = iso(tradeEnd(trade));
    const endsWhen = when(ends) === "past" && trade.indexerBehind ? "paused" : when(ends);
    rows.push(
      { kind: "reminder", at: reminder, when: when(reminder) },
      { kind: "report", at: report, when: when(report) },
      { kind: "today", at: iso(now), when: "today" },
      { kind: "ends", at: ends, when: endsWhen, outcome: expiryOutcome(trade) },
    );
  }
  rows.sort((a, b) => ms(a.at) - ms(b.at) || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  if (live) return [...rows, { kind: "rate", at: null, when: "future" }];

  rows.push({ kind: "end", at: trade.endedAt, when: "past", outcome: trade.status as Outcome });
  const { deadline } = nextStep(trade, now);
  if (deadline.kind === "rateBy" || deadline.kind === "rateUntil") {
    rows.push({ kind: "rateCloses", at: deadline.at, when: when(deadline.at) });
  }
  return rows;
}

/** The first row still ahead, for the folded Timeline's summary; null once nothing is. */
export function nextRow(rows: TimelineRow[]) {
  return rows.find((row) => row.when === "future" || row.when === "paused") ?? null;
}

/** Whether the clock carries the who-sends-first line: both give, and the banner isn't showing it. */
export function firstSenderInClock(trade: Trade) {
  return (
    trade.status === "in_progress" &&
    trade.firstSender !== null &&
    bothGive(trade) &&
    stepKind(trade) !== "yourTurn"
  );
}
