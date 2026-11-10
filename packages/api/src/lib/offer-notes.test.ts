import { describe, expect, test } from "bun:test";

import { offerNotes } from "./offer-notes";

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
