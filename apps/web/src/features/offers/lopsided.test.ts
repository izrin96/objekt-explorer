import { describe, expect, test } from "bun:test";

import { isLopsided } from "./lopsided";

const side = (length: number) => Array.from({ length }, () => ({}));
const offer = (give: number, get: number) => ({ give: side(give), get: side(get) });

describe("isLopsided", () => {
  test("a side at least five times the other", () => {
    expect(isLopsided(offer(17, 1))).toBe(true);
    expect(isLopsided(offer(1, 5))).toBe(true);
    expect(isLopsided(offer(5, 1))).toBe(true);
    expect(isLopsided(offer(10, 2))).toBe(true);
  });

  test("below five times", () => {
    expect(isLopsided(offer(4, 1))).toBe(false);
    expect(isLopsided(offer(9, 2))).toBe(false);
    expect(isLopsided(offer(3, 3))).toBe(false);
  });

  test("an empty side", () => {
    expect(isLopsided(offer(6, 0))).toBe(false);
    expect(isLopsided(offer(0, 6))).toBe(false);
  });
});
