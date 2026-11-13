import { describe, expect, test } from "bun:test";

import {
  type CandidateItem,
  listedAsAny,
  noteObjekts,
  offerPayloadSchema,
  tradePayloadSchema,
  tradeViewSchema,
} from "./offer";

const item = (side: "give" | "get", collectionSlug: string) => ({ side, collectionSlug });
// the creator gives seoyeon and gets jiwoo and kaede
const items = [item("give", "seoyeon"), item("get", "jiwoo"), item("get", "kaede")];

describe("noteObjekts", () => {
  test("the creator reads what they get first, then what they give", () => {
    expect(noteObjekts(items, "creator", "creator")).toEqual(["jiwoo", "kaede", "seoyeon"]);
  });

  test("the other party reads what the creator gives first", () => {
    expect(noteObjekts(items, "partner", "creator")).toEqual(["seoyeon", "jiwoo", "kaede"]);
  });

  test("keeps three, removes repeats, and is empty for no items", () => {
    const many = [...items, item("give", "jiwoo"), item("give", "nien"), item("get", "yuna")];
    expect(noteObjekts(many, "creator", "creator")).toEqual(["jiwoo", "kaede", "yuna"]);
    expect(noteObjekts(many, "partner", "creator")).toEqual(["seoyeon", "jiwoo", "nien"]);
    expect(noteObjekts([], "creator", "creator")).toEqual([]);
  });
});

describe("notification payloads", () => {
  const offer = {
    offerId: 1,
    conversationId: 2,
    tradeId: null,
    event: "received" as const,
    reason: null,
    partner: { userId: "u", name: "mina" },
  };

  test("a row written before objekts existed still parses, without them", () => {
    expect(offerPayloadSchema.parse(offer)).toEqual(offer);
    expect(offerPayloadSchema.parse({ ...offer, objekts: ["a", "b"] }).objekts).toEqual(["a", "b"]);
  });

  test("at most three collections", () => {
    expect(offerPayloadSchema.safeParse({ ...offer, objekts: ["a", "b", "c", "d"] }).success).toBe(
      false,
    );
    const trade = {
      tradeId: 1,
      offerId: 1,
      conversationId: 2,
      event: "completed" as const,
      reason: null,
      progress: { verified: 1, total: 2 },
      partner: { userId: "u", name: "mina" },
    };
    expect(tradePayloadSchema.parse(trade)).toEqual(trade);
    expect(tradePayloadSchema.safeParse({ ...trade, objekts: ["a", "b", "c", "d"] }).success).toBe(
      false,
    );
  });
});

describe("tradeViewSchema", () => {
  // the partner is left out: its shape is chat's, unchanged here
  const view = tradeViewSchema.omit({ partner: true });
  const before = {
    id: 516,
    offerId: 900,
    conversationId: 12,
    status: "in_progress" as const,
    cancelReason: null,
    cancelledByYou: null,
    proposedAt: "2026-10-30T10:00:00.000Z",
    acceptedAt: "2026-10-30T10:05:00.000Z",
    endedAt: null,
    topup: null,
    note: null,
    legs: [],
    progress: { verified: 0, total: 0 },
    firstSender: null,
    canCancel: false,
    cancelLocked: true,
    seenUntil: null,
    indexerBehind: false,
    canReport: false,
    rating: null,
    canRate: false,
    rateUntil: null,
    lastCheckedAt: null,
  };

  test("a payload from before cancel requests parses, with none open", () => {
    const parsed = view.parse(before);
    expect(parsed.cancelRequests).toEqual([]);
    expect(parsed.cancelRequest).toBeNull();
    expect(parsed.cancelAskOpensAt).toBeNull();
  });

  test("a lapsed request and the agreed reason parse", () => {
    const request = {
      byYou: false,
      at: "2026-10-30T11:22:00.000Z",
      status: "lapsed" as const,
      answeredAt: null,
    };
    const parsed = view.parse({
      ...before,
      status: "cancelled",
      cancelReason: "agreed",
      cancelRequests: [request],
    });
    expect(parsed.cancelRequests).toEqual([request]);
    expect(parsed.cancelReason).toBe("agreed");
  });
});

describe("listedAsAny", () => {
  const anyItem = (overrides: Partial<CandidateItem>): CandidateItem => ({
    collectionSlug: "divine01-jiwoo-312z",
    objektId: null,
    serial: null,
    serialEstimated: false,
    transferable: true,
    reserved: false,
    inOpenOffer: [],
    listSlug: "doubles",
    copies: 3,
    bySerial: false,
    ...overrides,
  });

  test("a whole entry on a list that shows serials is listed", () => {
    expect(listedAsAny(anyItem({ bySerial: true, hidden: 0 }))).toBe(true);
  });

  test("copies only Any serial reaches are listed", () => {
    expect(listedAsAny(anyItem({ hidden: 2 }))).toBe(true);
  });

  test("an any item that exists only because entries name shown copies is not", () => {
    expect(listedAsAny(anyItem({ hidden: 0, bySerial: false }))).toBe(false);
  });

  test("a server from before `hidden` is read as listed", () => {
    expect(listedAsAny(anyItem({}))).toBe(true);
  });

  test("a copy is never an any copy", () => {
    expect(listedAsAny(anyItem({ objektId: "5745609", hidden: 2 }))).toBe(false);
  });
});
