import { describe, expect, test } from "bun:test";

import { tokenIdWindow } from "./token-id-window";

describe("tokenIdWindow", () => {
  test("a window inside one digit length is one span", () => {
    expect(tokenIdWindow(26570707, 26571706)).toEqual([
      { length: 8, lo: "26570707", hi: "26571706" },
    ]);
  });

  test("a window across a power of ten splits at it", () => {
    expect(tokenIdWindow(9_999_950, 10_000_049)).toEqual([
      { length: 7, lo: "9999950", hi: "9999999" },
      { length: 8, lo: "10000000", hi: "10000049" },
    ]);
  });

  test("an empty window has no span", () => {
    expect(tokenIdWindow(10, 9)).toEqual([]);
  });
});
