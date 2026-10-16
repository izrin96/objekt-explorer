import { describe, expect, test } from "bun:test";

import { noteObjekts, offerPayloadSchema, tradePayloadSchema } from "./offer";

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
