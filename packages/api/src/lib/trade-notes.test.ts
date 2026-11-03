import { describe, expect, test } from "bun:test";

import type { SettledTrade } from "./trade-match";
import { wrongCopyNote } from "./trade-notes";

const settled: SettledTrade = { tradeId: 7, offerId: 3, conversationId: 9, userA: "a", userB: "b" };
const to = { userId: "a", partner: { userId: "b", name: "Bee" } };
const progress = { verified: 1, total: 2 };
const copy = {
  asked: { serial: 1, estimated: false },
  sent: { serial: 2, estimated: false },
};

describe("wrongCopyNote", () => {
  test("a DB-format acceptBy becomes an ISO time", () => {
    const note = wrongCopyNote(settled, "wrong_copy", to, progress, copy, "2026-11-01 10:00:00+00");
    expect(note.payload.acceptBy).toBe("2026-11-01T10:00:00.000Z");
  });

  test("an ISO acceptBy stays the same instant", () => {
    const note = wrongCopyNote(settled, "wrong_copy", to, progress, copy, "2026-11-01T10:00:00Z");
    expect(note.payload.acceptBy).toBe("2026-11-01T10:00:00.000Z");
  });

  test("null or missing acceptBy leaves the key absent", () => {
    expect(
      "acceptBy" in wrongCopyNote(settled, "wrong_copy", to, progress, copy, null).payload,
    ).toBe(false);
    expect("acceptBy" in wrongCopyNote(settled, "wrong_copy", to, progress, copy).payload).toBe(
      false,
    );
  });

  test("carries the trade, event, partner, progress and copy", () => {
    const note = wrongCopyNote(settled, "wrong_copy_due", to, progress, copy);
    expect(note).toEqual({
      type: "trade",
      userId: "a",
      payload: {
        tradeId: 7,
        offerId: 3,
        conversationId: 9,
        event: "wrong_copy_due",
        reason: null,
        progress,
        partner: { userId: "b", name: "Bee" },
        copy,
      },
    });
  });
});
