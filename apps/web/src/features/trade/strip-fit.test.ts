import { describe, expect, test } from "bun:test";

import { fitCount, hiddenCopies } from "./strip-fit";

const OPTIONS = { thumb: 40, gap: 6, fallback: 4 };

describe("fitCount", () => {
  test("draws everything that fits", () => {
    // 5 thumbnails and 4 gaps
    expect(fitCount(5 * 40 + 4 * 6, 5, OPTIONS)).toBe(5);
    expect(fitCount(600, 3, OPTIONS)).toBe(3);
  });

  test("keeps one place for the +N tile", () => {
    // room for 6, 27 to show: 5 thumbnails and the tile
    expect(fitCount(6 * 40 + 5 * 6, 27, OPTIONS)).toBe(5);
    // room for 5, 6 to show: the sixth would not fit, so 4 and the tile
    expect(fitCount(5 * 40 + 4 * 6, 6, OPTIONS)).toBe(4);
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

  test("leaves room for a trailing link", () => {
    // 100px link and a gap: 6 slots become 3, so 2 thumbnails and the tile
    const reserve = 100;
    expect(fitCount(6 * 40 + 5 * 6 + reserve + 6, 27, { ...OPTIONS, reserve })).toBe(5);
    expect(fitCount(6 * 40 + 5 * 6, 27, { ...OPTIONS, reserve })).toBe(2);
  });

  test("an unmeasured strip ignores the link", () => {
    expect(fitCount(0, 27, { ...OPTIONS, reserve: 100 })).toBe(4);
  });

  describe("on two lines", () => {
    const two = { ...OPTIONS, lines: 2 };
    // 6 per line
    const width = 6 * 40 + 5 * 6;

    test("a short list stays on one line's worth", () => {
      expect(fitCount(width, 5, two)).toBe(5);
    });

    test("the second line takes the overflow", () => {
      expect(fitCount(width, 12, two)).toBe(12);
    });

    test("keeps one place for the +N tile on the second line", () => {
      // 12 slots, 13 to show: 11 thumbnails and the tile
      expect(fitCount(width, 13, two)).toBe(11);
      expect(fitCount(width, 100, two)).toBe(11);
    });

    test("the trailing link only eats into the last line", () => {
      // the link leaves 3 places on line two: 6 + 3 slots, less one for the tile
      const reserve = 100;
      expect(fitCount(width, 100, { ...two, reserve })).toBe(8);
      // all of them fit with the link beside them
      expect(fitCount(width, 9, { ...two, reserve })).toBe(9);
    });

    test("an unmeasured strip still draws the fallback", () => {
      expect(fitCount(0, 27, two)).toBe(4);
    });
  });
});

describe("hiddenCopies", () => {
  test("counts the copies no drawn tile covers", () => {
    // 238 copies in 164 collections, 21 tiles drawn holding 40: the label's unit
    expect(hiddenCopies(238, [{ qty: 30 }, { qty: 10 }])).toBe(198);
  });

  test("a tile without a qty is one copy", () => {
    expect(hiddenCopies(5, [{}, {}, { qty: 2 }])).toBe(1);
  });

  test("nothing left when every tile is drawn", () => {
    expect(hiddenCopies(3, [{ qty: 2 }, { qty: 1 }])).toBe(0);
  });
});
