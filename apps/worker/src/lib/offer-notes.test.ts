import { describe, expect, test } from "bun:test";

import { earliest, offerNotes, toPublish } from "./offer-notes";

const offers = [{ id: 1, conversationId: 7, fromUserId: "a", toUserId: "b" }];
const name = (userId: string) => ({ userId, name: userId.toUpperCase() });

describe("offerNotes", () => {
  test("notes each party with the other as partner", () => {
    const notes = offerNotes(offers, "expired", null, name);
    expect(notes.map((n) => [n.userId, n.payload.partner.userId])).toEqual([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(notes[0]!.payload).toMatchObject({ offerId: 1, conversationId: 7, event: "expired" });
  });
});

describe("toPublish", () => {
  test("announces each offer's conversation to both parties", () => {
    expect(toPublish(offers, ["a"])).toEqual({
      notified: ["a"],
      conversations: [{ id: 7, userIds: ["a", "b"] }],
    });
  });
});

describe("earliest", () => {
  test("picks the earliest date", () => {
    expect(earliest(["2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z"])).toBe("2026-01-01T00:00:00Z");
  });
});
