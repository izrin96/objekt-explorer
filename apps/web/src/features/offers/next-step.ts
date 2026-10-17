import {
  COPY_ACCEPT_HOURS,
  TRADE_EXPIRE_DAYS,
  type TradeView as Trade,
} from "@repo/api/schemas/offer";

export type Leg = Trade["legs"][number];
export type Copy = Leg["substitutes"][number];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** A held copy and the leg it is held on. */
type HeldCopy = { leg: Leg; copy: Copy };

/** When the banner's right column counts to, and what it counts. */
export type Deadline =
  | { kind: "ends"; at: string }
  /** past the expiry while it is held back; never a negative count */
  | { kind: "endsHeld" }
  | { kind: "decide"; at: string }
  | { kind: "copyLeft"; at: string }
  | { kind: "rateUntil"; at: string }
  | { kind: "ended"; at: string | null };

/** Small warning lines under the body, each at most once, in this order. */
type Note =
  | { kind: "indexerBehind" }
  | { kind: "ownStuck"; leg: Leg }
  | { kind: "theirStuck"; leg: Leg };

/** What the body of Your turn says about who sends first. */
type SendBody = "send" | "firstYou" | "firstThem" | "firstThemSent";

type Base = { deadline: Deadline };
type Live = Base & { notes: Note[] };

export type NextStep =
  | (Base & { kind: "completed"; canRate: boolean })
  | (Base & { kind: "failed"; canReport: boolean; canRate: boolean })
  | (Base & { kind: "cancelled" })
  | (Live & ({ kind: "youDecide" } & HeldCopy))
  | (Live & { kind: "yourTurn"; legs: Leg[]; body: SendBody; canCancel: boolean })
  | (Live & { kind: "stuck"; leg: Leg })
  | (Live & ({ kind: "theyDecide" } & HeldCopy))
  | (Live & { kind: "theirTurn"; canReport: boolean });

export type StepKind = NextStep["kind"];

const time = (iso: string) => new Date(iso).getTime();

const pending = (leg: Leg) => leg.substitutes.filter((copy) => copy.status === "pending");

/** When the copy counts as accepted; the field is optional, so fall back to the rule. */
function dueAt(copy: Copy) {
  return copy.acceptBy ? time(copy.acceptBy) : time(copy.at) + COPY_ACCEPT_HOURS * HOUR_MS;
}

/**
 * One per leg, its earliest pending copy (the server sends them oldest first, and only that one
 * carries `acceptBy`); of those, the one due first.
 */
function earliestCopy(legs: Leg[]): HeldCopy | null {
  let best: HeldCopy | null = null;
  for (const leg of legs) {
    const [copy] = pending(leg);
    if (copy && (best === null || dueAt(copy) < dueAt(best.copy))) best = { leg, copy };
  }
  return best;
}

export function tradeEnd(trade: Pick<Trade, "acceptedAt">) {
  return time(trade.acceptedAt) + TRADE_EXPIRE_DAYS * DAY_MS;
}

type Sets = { owed: Leg[]; sendable: Leg[]; toDecide: Leg[] };

function sets(trade: Trade): Sets {
  const waiting = trade.legs.filter((leg) => leg.state === "waiting");
  const owed = waiting.filter((leg) => leg.fromYou);
  return {
    owed,
    sendable: owed.filter((leg) => !leg.stuck && pending(leg).length === 0),
    toDecide: waiting.filter((leg) => !leg.fromYou && pending(leg).length > 0),
  };
}

/** The state alone, which the clock also reads. First match wins; see design.md Decision 1. */
export function stepKind(trade: Trade): StepKind {
  if (trade.status === "completed") return "completed";
  if (trade.status === "failed") return "failed";
  if (trade.status === "cancelled") return "cancelled";
  const { owed, sendable, toDecide } = sets(trade);
  if (toDecide.length > 0) return "youDecide";
  if (sendable.length > 0) return "yourTurn";
  if (owed.length === 0) return "theirTurn";
  if (owed.some((leg) => leg.stuck)) return "stuck";
  return "theyDecide";
}

export function bothGive(trade: Pick<Trade, "legs">) {
  return trade.legs.some((leg) => leg.fromYou) && trade.legs.some((leg) => !leg.fromYou);
}

function sendBody(trade: Trade): SendBody {
  const first = trade.firstSender;
  if (!bothGive(trade) || first === null) return "send";
  if (first.you) return "firstYou";
  return first.sent ? "firstThemSent" : "firstThem";
}

function endsDeadline(trade: Trade, now: number): Deadline {
  const end = tradeEnd(trade);
  return now >= end ? { kind: "endsHeld" } : { kind: "ends", at: new Date(end).toISOString() };
}

function copyDeadline(copy: Copy, fallback: Deadline, kind: "decide" | "copyLeft"): Deadline {
  return copy.acceptBy ? { kind, at: copy.acceptBy } : fallback;
}

function endedDeadline(trade: Trade, rated: boolean): Deadline {
  return rated && trade.rateUntil
    ? { kind: "rateUntil", at: trade.rateUntil }
    : { kind: "ended", at: trade.endedAt };
}

/** The banner's state for a trade at `now`, a time in ms. */
export function nextStep(trade: Trade, now: number): NextStep {
  const kind = stepKind(trade);
  if (kind === "completed") {
    return {
      kind,
      canRate: trade.canRate,
      deadline: endedDeadline(trade, trade.canRate),
    };
  }
  if (kind === "failed") {
    return {
      kind,
      canReport: trade.canReport,
      canRate: trade.canRate,
      deadline: endedDeadline(trade, trade.canRate),
    };
  }
  if (kind === "cancelled") return { kind, deadline: { kind: "ended", at: trade.endedAt } };

  const { owed, sendable, toDecide } = sets(trade);
  const ends = endsDeadline(trade, now);
  const behind: Note[] = trade.indexerBehind ? [{ kind: "indexerBehind" }] : [];
  const theirStuck = trade.legs.find((leg) => !leg.fromYou && leg.state === "waiting" && leg.stuck);
  const theirStuckNote: Note[] = theirStuck ? [{ kind: "theirStuck", leg: theirStuck }] : [];

  switch (kind) {
    case "youDecide": {
      const held = earliestCopy(toDecide)!;
      return {
        kind,
        ...held,
        notes: behind,
        deadline: copyDeadline(held.copy, ends, "decide"),
      };
    }
    case "yourTurn": {
      const stuck = owed.find((leg) => leg.stuck);
      return {
        kind,
        legs: sendable,
        body: sendBody(trade),
        canCancel: trade.canCancel,
        notes: [
          ...behind,
          ...(stuck ? [{ kind: "ownStuck", leg: stuck } as const] : []),
          ...theirStuckNote,
        ],
        deadline: ends,
      };
    }
    case "stuck":
      return {
        kind,
        leg: owed.find((leg) => leg.stuck)!,
        notes: behind,
        deadline: ends,
      };
    case "theyDecide": {
      const held = earliestCopy(owed)!;
      return {
        kind,
        ...held,
        notes: behind,
        deadline: copyDeadline(held.copy, ends, "copyLeft"),
      };
    }
    default:
      return {
        kind: "theirTurn",
        canReport: trade.canReport,
        notes: [...behind, ...theirStuckNote],
        deadline: ends,
      };
  }
}

/** Midnight of the instant's date in the runtime's zone, as a UTC day count, so DST can't skew it. */
const localDay = (ms: number) => {
  const date = new Date(ms);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
};

/**
 * Calendar days to the deadline's date in the viewer's zone, so the count agrees with the date
 * shown beside it; under 24 hours, whole hours rounded up, at least 1.
 */
export function timeLeft(at: string, now: number): { unit: "day" | "hour"; value: number } {
  const left = Math.max(0, time(at) - now);
  if (left >= DAY_MS) return { unit: "day", value: localDay(time(at)) - localDay(now) };
  return { unit: "hour", value: Math.max(1, Math.ceil(left / HOUR_MS)) };
}
