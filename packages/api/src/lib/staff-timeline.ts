import type {
  CancelRequestStatus,
  SubstituteStatus,
  TradeCancelReason,
  TradeStatus,
} from "../schemas/offer";
import type { StaffTimelineRow } from "../schemas/staff-totals";

export type TimelineTrade = {
  userA: string;
  userB: string;
  proposedAt: string;
  acceptedAt: string;
  status: TradeStatus;
  endedAt: string | null;
  cancelReason: TradeCancelReason | null;
  cancelledBy: string | null;
  legs: {
    id: number;
    fromUserId: string;
    toUserId: string;
    verifiedAt: string | null;
    confirmedAt: string | null;
    awayAt: string | null;
    untransferableAt: string | null;
  }[];
  copies: {
    legId: number;
    transferredAt: string;
    status: SubstituteStatus;
    decidedAt: string | null;
    autoAccepted: boolean;
  }[];
  cancelRequests: {
    askedBy: string;
    askedAt: string;
    status: CancelRequestStatus;
    answeredAt: string | null;
  }[];
};

/**
 * A trade's dated story in the third person, for staff: every row names who acted by id and
 * none carries text. Rows on the same instant keep the order they are pushed in (a copy's
 * decision before the leg it verifies, a leg before the ending, the ending before a lapse).
 */
export function staffTimeline(trade: TimelineTrade): StaffTimelineRow[] {
  const rows: StaffTimelineRow[] = [];
  const push = (at: string, kind: StaffTimelineRow["kind"], more: Partial<StaffTimelineRow> = {}) =>
    rows.push({
      at: new Date(at).toISOString(),
      kind,
      userId: null,
      legId: null,
      auto: false,
      reason: null,
      ...more,
    });
  const other = (id: string) => (id === trade.userA ? trade.userB : trade.userA);
  const legById = new Map(trade.legs.map((leg) => [leg.id, leg]));

  push(trade.proposedAt, "proposed");
  push(trade.acceptedAt, "accepted");

  for (const copy of trade.copies) {
    const leg = legById.get(copy.legId);
    push(copy.transferredAt, "copy_sent", { legId: copy.legId, userId: leg?.fromUserId ?? null });
    if (copy.decidedAt === null || copy.status === "pending") continue;
    push(copy.decidedAt, copy.status === "accepted" ? "copy_accepted" : "copy_declined", {
      legId: copy.legId,
      auto: copy.autoAccepted,
      userId: copy.autoAccepted ? null : (leg?.toUserId ?? null),
    });
  }

  for (const leg of trade.legs) {
    if (leg.confirmedAt !== null) {
      push(leg.confirmedAt, "leg_confirmed", { legId: leg.id, userId: leg.toUserId });
    } else if (leg.verifiedAt !== null) {
      push(leg.verifiedAt, "leg_verified", { legId: leg.id, userId: leg.fromUserId });
    }
    if (leg.awayAt !== null)
      push(leg.awayAt, "leg_away", { legId: leg.id, userId: leg.fromUserId });
    if (leg.untransferableAt !== null) {
      push(leg.untransferableAt, "leg_stuck", { legId: leg.id, userId: leg.fromUserId });
    }
  }

  const lapsed: TimelineTrade["cancelRequests"] = [];
  for (const ask of trade.cancelRequests) {
    push(ask.askedAt, "cancel_asked", { userId: ask.askedBy });
    if (ask.status === "pending") {
      if (trade.status !== "in_progress") lapsed.push(ask);
      continue;
    }
    if (ask.answeredAt === null) continue;
    push(ask.answeredAt, `cancel_${ask.status}`, {
      userId: ask.status === "withdrawn" ? ask.askedBy : other(ask.askedBy),
    });
  }

  if (trade.endedAt !== null && trade.status !== "in_progress") {
    push(trade.endedAt, trade.status, {
      reason: trade.cancelReason,
      userId: trade.status === "cancelled" ? trade.cancelledBy : null,
    });
    for (const ask of lapsed) push(trade.endedAt, "cancel_lapsed", { userId: ask.askedBy });
  }

  return rows.toSorted((x, y) => Date.parse(x.at) - Date.parse(y.at));
}
