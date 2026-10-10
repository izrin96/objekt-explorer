import { describe, expect, test } from "bun:test";

import { parseState } from "./want-alert-state";

describe("parseState", () => {
  test("reads a stored state", () => {
    const state = { discoverable: [1], marks: [[10, 5]], progress: [[2, 9]] };
    expect(parseState(JSON.stringify(state))).toEqual(state as never);
  });

  test("rejects malformed json and missing fields", () => {
    expect(parseState("{")).toBeNull();
    expect(parseState(JSON.stringify({ discoverable: [] }))).toBeNull();
  });
});
