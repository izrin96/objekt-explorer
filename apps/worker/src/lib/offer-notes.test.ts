import { describe, expect, test } from "bun:test";

import { earliest, toPublish } from "./offer-notes";

const offers = [{ id: 1, conversationId: 7, fromUserId: "a", toUserId: "b" }];

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
