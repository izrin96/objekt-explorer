import * as z from "zod";

/** A trade's states in `stepKind`'s order (apps/web `features/offers/next-step.ts`), offers first. */
export const DEAL_STATES = [
  "waitingYou",
  "waitingThem",
  "youDecide",
  "yourTurn",
  "theirTurn",
  "stuck",
  "theyDecide",
  "completed",
  "failed",
] as const;
export type DealState = (typeof DEAL_STATES)[number];

/** What the Inbox's Needs you lists; `needsYouSql` (services/chat/deal.ts) is the SQL twin. */
export const NEEDS_YOU_STATES = [
  "waitingYou",
  "youDecide",
  "yourTurn",
] as const satisfies readonly DealState[];

export const dealSchema = z.object({
  kind: z.enum(["offer", "trade"]),
  /** the offer's or the trade's number */
  id: z.number(),
  state: z.enum(DEAL_STATES),
  /** objekts the viewer can send now, on Your turn */
  count: z.number().nullable(),
  /** verified objekts of all, on a running trade */
  verified: z.number().nullable(),
  total: z.number().nullable(),
  /** the offer's expiry, or the end of the rating window */
  until: z.string().nullable(),
});
export type Deal = z.infer<typeof dealSchema>;

/** One offer of a conversation, its trade, and the viewer's legs in it, as one read gives them. */
export type DealRow = {
  offerId: number;
  offerStatus: string;
  offerToId: string;
  offerExpiresAt: string;
  trade: {
    id: number;
    status: string;
    verified: number;
    total: number;
    /** open, unverified legs the viewer gives */
    owed: number;
    /** of those, transferable and with no different copy waiting */
    sendable: number;
    /** of those, not transferable */
    stuck: number;
    /** open, unverified legs the viewer receives, holding a different copy for them to decide on */
    toDecide: number;
    /** the viewer may rate now (`rateRefusal`) and has not */
    rateable: boolean;
    rateUntil: string | null;
  } | null;
};

export const needsYou = (state: DealState) =>
  (NEEDS_YOU_STATES as readonly DealState[]).includes(state);

const tradeState = (t: NonNullable<DealRow["trade"]>): DealState => {
  if (t.toDecide > 0) return "youDecide";
  if (t.sendable > 0) return "yourTurn";
  if (t.owed === 0) return "theirTurn";
  return t.stuck > 0 ? "stuck" : "theyDecide";
};

/** One offer's deal, or null when it is not open, running or left to rate. */
function dealFor(row: DealRow, viewerId: string, now: Date): Deal | null {
  const { trade } = row;
  if (trade === null) {
    if (row.offerStatus !== "open" || new Date(row.offerExpiresAt) <= now) return null;
    return {
      kind: "offer",
      id: row.offerId,
      state: row.offerToId === viewerId ? "waitingYou" : "waitingThem",
      count: null,
      verified: null,
      total: null,
      until: new Date(row.offerExpiresAt).toISOString(),
    };
  }
  const base = { kind: "trade" as const, id: trade.id, count: null, verified: null, total: null };
  if (trade.status === "completed" || trade.status === "failed") {
    if (!trade.rateable) return null;
    return { ...base, state: trade.status, until: trade.rateUntil };
  }
  if (trade.status !== "in_progress") return null;
  const state = tradeState(trade);
  return {
    ...base,
    state,
    count: state === "yourTurn" ? trade.sendable : null,
    verified: trade.verified,
    total: trade.total,
    until: null,
  };
}

/** What waits on the viewer first, then what else is live, then what is left to rate. */
const urgency = (state: DealState) =>
  needsYou(state) ? 0 : state === "completed" || state === "failed" ? 2 : 1;

/**
 * The deal a conversation's row and strip show, of every offer it holds: one conversation can
 * hold an open offer and several trades at once. The most urgent wins, then the newest offer.
 */
export function dealOf(rows: readonly DealRow[], viewerId: string, now: Date): Deal | null {
  let best: { deal: Deal; offerId: number } | null = null;
  for (const row of rows) {
    const deal = dealFor(row, viewerId, now);
    if (deal === null) continue;
    const rank = urgency(deal.state);
    if (
      best === null ||
      rank < urgency(best.deal.state) ||
      (rank === urgency(best.deal.state) && row.offerId > best.offerId)
    ) {
      best = { deal, offerId: row.offerId };
    }
  }
  return best?.deal ?? null;
}
