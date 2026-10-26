import type { TradeView } from "@repo/api/schemas/offer";

type Leg = TradeView["legs"][number];

export const ACCEPTED = "2026-10-08T12:00:00.000Z";
export const DAY = 86_400_000;
export const HOUR = 3_600_000;
const PARTNER = "0x9ca6000000000000000000000000000000008b0d";

let nextId = 1;

/** A waiting leg the viewer owes; override anything. */
export function leg(overrides: Partial<Leg> = {}): Leg {
  return {
    id: nextId++,
    collectionSlug: "a201z",
    objektId: "o-1",
    serial: 722,
    serialEstimated: false,
    fromYou: true,
    open: true,
    state: "waiting",
    stuck: false,
    away: null,
    verifiedAt: null,
    txHash: null,
    verifiedObjektId: null,
    verifiedSerial: null,
    verifiedSerialEstimated: false,
    substitutes: [],
    ...overrides,
  };
}

export function copy(overrides: Partial<Leg["substitutes"][number]> = {}) {
  return {
    id: nextId++,
    objektId: "o-2",
    serial: 1188,
    serialEstimated: false,
    txHash: "0xabc",
    at: "2026-10-15T12:00:00.000Z",
    status: "pending" as const,
    acceptBy: "2026-10-18T12:00:00.000Z",
    ...overrides,
  };
}

export function verified(overrides: Partial<Leg> = {}): Leg {
  return leg({
    state: "verified",
    verifiedAt: "2026-10-12T12:00:00.000Z",
    txHash: "0xdef",
    verifiedObjektId: "o-1",
    ...overrides,
  });
}

/** A swap in progress: the viewer owes one leg, the partner another. */
export function trade(overrides: Partial<TradeView> = {}): TradeView {
  const legs = overrides.legs ?? [leg(), leg({ fromYou: false })];
  const done = legs.filter((l) => l.state === "verified").length;
  return {
    id: 88,
    offerId: 120,
    conversationId: 7,
    partner: {
      userId: "p",
      user: { image: null } as TradeView["partner"]["user"],
      identity: { name: "binary.bin", address: PARTNER, nickname: "binary.bin", also: [] },
      reputation: null,
    },
    status: "in_progress",
    cancelReason: null,
    cancelledByYou: null,
    proposedAt: "2026-10-07T12:00:00.000Z",
    acceptedAt: ACCEPTED,
    endedAt: null,
    topup: null,
    note: null,
    legs,
    progress: { verified: done, total: legs.length },
    firstSender: null,
    canCancel: done === 0,
    cancelLocked: done > 0,
    seenUntil: null,
    indexerBehind: false,
    canReport: false,
    rating: null,
    canRate: false,
    rateUntil: null,
    lastCheckedAt: null,
    ...overrides,
  };
}
