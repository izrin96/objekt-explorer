import { describe, expect, test } from "bun:test";

import { EARLIER_LIMIT, isTimestamp, notificationSchema } from "./notification";

const trade = {
  id: 7,
  readAt: null,
  createdAt: "2026-10-17T00:00:00.000Z",
  type: "trade",
  payload: {
    tradeId: 89,
    offerId: 251,
    conversationId: 359,
    event: "leg_verified",
    reason: null,
    progress: { verified: 1, total: 2 },
    partner: { userId: "u", name: "binary.bin" },
  },
} as const;

describe("notificationSchema", () => {
  test("a row without the grouped fields or an image still parses", () => {
    expect(notificationSchema.parse(trade)).toEqual(trade);
  });

  test("a head carries its updates, earlier rows and the partner's image", () => {
    const head = {
      ...trade,
      payload: { ...trade.payload, partner: { ...trade.payload.partner, image: null } },
      updates: 2,
      earlier: [trade, { ...trade, id: 6 }],
    };
    expect(notificationSchema.parse(head)).toEqual(head);
  });

  test("earlier is capped", () => {
    const earlier = Array.from({ length: EARLIER_LIMIT + 1 }, (_, id) => ({ ...trade, id }));
    expect(notificationSchema.safeParse({ ...trade, updates: 11, earlier }).success).toBe(false);
  });
});

describe("isTimestamp", () => {
  test("accepts what the database writes and ISO 8601", () => {
    expect(isTimestamp("2026-10-17 00:00:00.123456+00")).toBe(true);
    expect(isTimestamp("2026-10-17 05:30:00+09:00")).toBe(true);
    expect(isTimestamp("2026-10-17T00:00:00.000Z")).toBe(true);
    expect(isTimestamp("0004-02-29 00:00:00+00")).toBe(true);
    expect(isTimestamp("0001-02-29 00:00:00+00")).toBe(false);
  });

  test("rejects what the timestamptz cast would throw on", () => {
    expect(isTimestamp("")).toBe(false);
    expect(isTimestamp("yesterday")).toBe(false);
    expect(isTimestamp("2026-02-30 00:00:00+00")).toBe(false);
    expect(isTimestamp("2026-13-01T00:00:00Z")).toBe(false);
    expect(isTimestamp("2026-10-17T24:00:00Z")).toBe(false);
    expect(isTimestamp("0000-10-17T00:00:00Z")).toBe(false);
    expect(isTimestamp("2026-10-17 00:00:00.1234567+00")).toBe(false);
  });
});
