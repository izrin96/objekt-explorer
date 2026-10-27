import { describe, expect, test } from "bun:test";

import { type DealRow, dealOf, NEEDS_YOU_STATES, needsYou } from "./chat-deal";

const ME = "me";
const NOW = new Date("2026-10-28T12:00:00Z");

const offer = (over: Partial<DealRow> = {}): DealRow => ({
  offerId: 261,
  offerStatus: "open",
  offerToId: ME,
  offerExpiresAt: "2026-11-01T12:00:00Z",
  trade: null,
  ...over,
});

const trade = (over: Partial<NonNullable<DealRow["trade"]>> = {}): DealRow =>
  offer({
    offerStatus: "accepted",
    trade: {
      id: 89,
      status: "in_progress",
      verified: 2,
      total: 8,
      owed: 0,
      sendable: 0,
      stuck: 0,
      toDecide: 0,
      rateable: false,
      rateUntil: null,
      ...over,
    },
  });

const stateOf = (row: DealRow) => dealOf([row], ME, NOW)?.state ?? "none";

describe("dealOf", () => {
  test("offer to you", () => {
    expect(dealOf([offer()], ME, NOW)).toEqual({
      kind: "offer",
      id: 261,
      state: "waitingYou",
      count: null,
      verified: null,
      total: null,
      until: "2026-11-01T12:00:00.000Z",
    });
  });

  test("offer from you", () => {
    expect(stateOf(offer({ offerToId: "them" }))).toBe("waitingThem");
  });

  test("countered, declined, withdrawn and expired offers show nothing", () => {
    for (const offerStatus of ["countered", "declined", "withdrawn", "expired", "cancelled"]) {
      expect(stateOf(offer({ offerStatus }))).toBe("none");
    }
  });

  test("an open offer past its expiry shows nothing", () => {
    expect(stateOf(offer({ offerExpiresAt: "2026-10-28T11:59:59Z" }))).toBe("none");
  });

  test("you decide", () => {
    expect(stateOf(trade({ toDecide: 1 }))).toBe("youDecide");
  });

  test("you decide comes before your turn", () => {
    expect(stateOf(trade({ toDecide: 1, owed: 4, sendable: 4 }))).toBe("youDecide");
  });

  test("your turn counts what can be sent now", () => {
    expect(dealOf([trade({ owed: 5, sendable: 4, stuck: 1 })], ME, NOW)).toMatchObject({
      kind: "trade",
      id: 89,
      state: "yourTurn",
      count: 4,
      verified: 2,
      total: 8,
    });
  });

  test("their turn", () => {
    expect(dealOf([trade()], ME, NOW)).toMatchObject({ state: "theirTurn", count: null });
  });

  test("stuck", () => {
    expect(stateOf(trade({ owed: 1, stuck: 1 }))).toBe("stuck");
  });

  test("they decide", () => {
    expect(stateOf(trade({ owed: 1 }))).toBe("theyDecide");
  });

  test("completed and failed show while rateable", () => {
    const until = "2026-11-10T00:00:00.000Z";
    expect(
      dealOf([trade({ status: "completed", rateable: true, rateUntil: until })], ME, NOW),
    ).toEqual({
      kind: "trade",
      id: 89,
      state: "completed",
      count: null,
      verified: null,
      total: null,
      until,
    });
    expect(stateOf(trade({ status: "failed", rateable: true, rateUntil: until }))).toBe("failed");
  });

  test("rated, unrateable and cancelled trades show nothing", () => {
    expect(stateOf(trade({ status: "completed" }))).toBe("none");
    expect(stateOf(trade({ status: "failed" }))).toBe("none");
    expect(stateOf(trade({ status: "cancelled", rateable: true }))).toBe("none");
  });

  test("no offer", () => {
    expect(dealOf([], ME, NOW)).toBeNull();
  });

  test("a trade waiting on you wins over a newer offer from you", () => {
    const running = trade({ owed: 2, sendable: 2 });
    const newer = offer({ offerId: 300, offerToId: "them" });
    expect(dealOf([newer, running], ME, NOW)).toMatchObject({ kind: "trade", state: "yourTurn" });
  });

  test("a running trade wins over an expired newer offer and one to rate", () => {
    const expired = offer({ offerId: 300, offerExpiresAt: "2026-10-27T00:00:00Z" });
    const rate = offer({
      offerId: 200,
      offerStatus: "accepted",
      trade: { ...trade().trade!, id: 70, status: "completed", rateable: true },
    });
    expect(dealOf([expired, rate, trade()], ME, NOW)).toMatchObject({ id: 89, state: "theirTurn" });
  });

  test("a trade to rate comes after any live one, even on a newer offer", () => {
    const rate = offer({
      offerId: 300,
      offerStatus: "accepted",
      trade: { ...trade().trade!, id: 95, status: "completed", rateable: true },
    });
    expect(dealOf([rate, trade()], ME, NOW)).toMatchObject({ id: 89, state: "theirTurn" });
  });

  test("the newest offer wins among equally urgent deals", () => {
    const older = offer({
      offerId: 250,
      offerStatus: "accepted",
      trade: { ...trade().trade!, id: 88 },
    });
    expect(dealOf([older, trade()], ME, NOW)?.id).toBe(89);
    expect(dealOf([trade(), older], ME, NOW)?.id).toBe(89);
  });
});

test("Needs you is offer to you, you decide and your turn, as needsYouSql filters", () => {
  expect([...NEEDS_YOU_STATES]).toEqual(["waitingYou", "youDecide", "yourTurn"]);
  expect(needsYou("stuck")).toBe(false);
  expect(needsYou("yourTurn")).toBe(true);
});
