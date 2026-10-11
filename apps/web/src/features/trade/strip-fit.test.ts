import { describe, expect, test } from "bun:test";

import { fitCount } from "./strip-fit";

const OPTIONS = { thumb: 56, gap: 6, fallback: 4 };

describe("fitCount", () => {
  test("draws everything that fits", () => {
    // 5 thumbnails and 4 gaps
    expect(fitCount(5 * 56 + 4 * 6, 5, OPTIONS)).toBe(5);
    expect(fitCount(600, 3, OPTIONS)).toBe(3);
  });

  test("keeps one place for the +N tile", () => {
    // room for 6, 27 to show: 5 thumbnails and the tile
    expect(fitCount(6 * 56 + 5 * 6, 27, OPTIONS)).toBe(5);
    // room for 5, 6 to show: the sixth would not fit, so 4 and the tile
    expect(fitCount(5 * 56 + 4 * 6, 6, OPTIONS)).toBe(4);
  });

  test("falls back before the first measure", () => {
    expect(fitCount(0, 27, OPTIONS)).toBe(4);
  });

  test("never draws more than there is", () => {
    expect(fitCount(0, 2, OPTIONS)).toBe(2);
  });

  test("a strip too narrow for one thumbnail draws none", () => {
    expect(fitCount(40, 5, OPTIONS)).toBe(0);
  });
});
