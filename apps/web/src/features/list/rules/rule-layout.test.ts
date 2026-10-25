import { describe, expect, test } from "bun:test";

import { showsHeadings } from "./rule-layout";

const groups = (...sizes: number[]) =>
  sizes.map((size) => ({ objekts: Array.from({ length: size }) }));

describe("showsHeadings", () => {
  test("one collection reads flat, however many members", () => {
    expect(showsHeadings(groups(24))).toBe(false);
  });

  test("several collections of every member get headings", () => {
    expect(showsHeadings(groups(24, 24, 24, 24))).toBe(true);
  });

  test("one or two chosen members a collection read flat", () => {
    expect(showsHeadings(groups(1, 1, 1, 1, 1, 1, 1, 1))).toBe(false);
    expect(showsHeadings(groups(2, 2, 2))).toBe(false);
  });

  test("three a collection is enough", () => {
    expect(showsHeadings(groups(3, 3))).toBe(true);
  });
});
