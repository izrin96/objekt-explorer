import { describe, expect, test } from "bun:test";

import { isListedWithin, LISTED_WINDOWS, LISTED_WINDOW_SECONDS } from "./listed-window";

const NOW = 1_800_000_000;

describe("isListedWithin", () => {
  for (const window of LISTED_WINDOWS) {
    const seconds = LISTED_WINDOW_SECONDS[window];
    test(`${window}: the start is in, one second earlier is out`, () => {
      expect(isListedWithin(NOW - seconds, window, NOW)).toBe(true);
      expect(isListedWithin(NOW - seconds - 1, window, NOW)).toBe(false);
    });
  }

  test("a future listing is in", () => {
    expect(isListedWithin(NOW + 60, "24h", NOW)).toBe(true);
  });
});
