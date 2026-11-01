import { describe, expect, test } from "bun:test";

import { EARLIER_LIMIT, notificationSchema } from "./notification";

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
