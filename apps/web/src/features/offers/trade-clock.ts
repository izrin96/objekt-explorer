import {
  REMIND_AFTER_HOURS,
  REPORT_AFTER_DAYS,
  type TradeView as Trade,
} from "@repo/api/schemas/offer";

import { bothGive, type Copy, type Leg, stepKind, tradeEnd } from "./next-step";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

type ClockWhen = "past" | "today" | "future";

export type ClockRow =
  | { kind: "accepted"; at: string; when: ClockWhen }
  | { kind: "sent"; at: string; when: ClockWhen; leg: Leg }
  | { kind: "copyDue"; at: string; when: ClockWhen; leg: Leg; copy: Copy }
  | { kind: "reminder"; at: string; when: ClockWhen }
  | { kind: "report"; at: string; when: ClockWhen }
  | { kind: "today"; at: string; when: "today" }
  | { kind: "ends"; at: string; when: ClockWhen; outcome: "failed" | "cancelled" }
  /** undated, always last */
  | { kind: "rate"; at: null; when: "future" };

/** Rows at the same instant keep this order. */
const ORDER: ClockRow["kind"][] = [
  "accepted",
  "sent",
  "copyDue",
  "reminder",
  "report",
  "today",
  "ends",
  "rate",
];

/** What an unfinished trade ends as at its expiry: a verified leg or a held copy makes it failed. */
export function expiryOutcome(trade: Pick<Trade, "progress" | "legs">) {
  return trade.progress.verified > 0 || trade.legs.some((leg) => leg.substitutes.length > 0)
    ? ("failed" as const)
    : ("cancelled" as const);
}

const iso = (ms: number) => new Date(ms).toISOString();

/** The dated rows of an in-progress trade, in time order, with `now` (ms) among them. */
export function clockRows(trade: Trade, now: number): ClockRow[] {
  const accepted = new Date(trade.acceptedAt).getTime();
  const when = (at: string): ClockWhen => (new Date(at).getTime() <= now ? "past" : "future");
  const dated: Exclude<ClockRow, { kind: "rate" }>[] = [
    { kind: "accepted", at: trade.acceptedAt, when: when(trade.acceptedAt) },
  ];
  for (const leg of trade.legs) {
    if (leg.state === "verified" && leg.verifiedAt) {
      dated.push({ kind: "sent", at: leg.verifiedAt, when: when(leg.verifiedAt), leg });
    }
    for (const copy of leg.substitutes) {
      if (copy.status === "pending" && copy.acceptBy) {
        dated.push({ kind: "copyDue", at: copy.acceptBy, when: when(copy.acceptBy), leg, copy });
      }
    }
  }
  const reminder = iso(accepted + REMIND_AFTER_HOURS * HOUR_MS);
  const report = iso(accepted + REPORT_AFTER_DAYS * DAY_MS);
  const ends = iso(tradeEnd(trade));
  dated.push(
    { kind: "reminder", at: reminder, when: when(reminder) },
    { kind: "report", at: report, when: when(report) },
    { kind: "today", at: iso(now), when: "today" },
    { kind: "ends", at: ends, when: when(ends), outcome: expiryOutcome(trade) },
  );
  dated.sort(
    (a, b) =>
      new Date(a.at).getTime() - new Date(b.at).getTime() ||
      ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind),
  );
  return [...dated, { kind: "rate", at: null, when: "future" }];
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

export type HistoryRow =
  | { kind: "proposed"; at: string }
  | { kind: "accepted"; at: string }
  | { kind: "transfer"; at: string | null; leg: Leg }
  | { kind: "end"; at: string | null; outcome: "completed" | "failed" | "cancelled" };

/** An ended trade's rows: proposed, accepted, each verified transfer by time, then the end. */
export function historyRows(trade: Trade): HistoryRow[] {
  const transfers = trade.legs
    .filter((leg) => leg.state === "verified")
    .toSorted(
      (a, b) =>
        new Date(a.verifiedAt ?? 0).getTime() - new Date(b.verifiedAt ?? 0).getTime() ||
        a.id - b.id,
    )
    .map((leg): HistoryRow => ({ kind: "transfer", at: leg.verifiedAt, leg }));
  const end: HistoryRow[] =
    trade.status === "in_progress"
      ? []
      : [{ kind: "end", at: trade.endedAt, outcome: trade.status }];
  return [
    { kind: "proposed", at: trade.proposedAt },
    { kind: "accepted", at: trade.acceptedAt },
    ...transfers,
    ...end,
  ];
}
