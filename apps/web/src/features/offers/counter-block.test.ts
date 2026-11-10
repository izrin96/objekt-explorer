import { describe, expect, test } from "bun:test";

import { counterBlockOf } from "./counter-block";

const open = { status: "open" as const, mine: false };

describe("counterBlockOf", () => {
  test("Counter offered: nothing blocks it", () => {
    expect(counterBlockOf({ ...open, actions: ["accept", "decline", "counter"] })).toBeNull();
  });

  test("a chat mute leaves Accept and Decline", () => {
    expect(counterBlockOf({ ...open, actions: ["accept", "decline"] })).toBe("muted");
  });

  test("a trade block leaves only Decline", () => {
    expect(counterBlockOf({ ...open, actions: ["decline"] })).toBe("trade_blocked");
  });

  test("an answered offer, or the viewer's own, has no block to name", () => {
    expect(counterBlockOf({ status: "expired", mine: false, actions: [] })).toBeNull();
    expect(counterBlockOf({ status: "open", mine: true, actions: ["withdraw"] })).toBeNull();
  });
});
