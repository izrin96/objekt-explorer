import { describe, expect, test } from "bun:test";

import { sparklinePath } from "./price-sparkline";

describe("sparklinePath", () => {
  test("runs from the first to the last value, low at the bottom", () => {
    expect(sparklinePath([1, 2, 3], 100, 20)).toBe("M0,20L50,10L100,0");
  });

  test("breaks the line at a missing day", () => {
    expect(sparklinePath([1, null, 3], 100, 20)).toBe("M0,20M100,0");
    expect(sparklinePath([1, 2, null, 2, 1], 100, 20)).toBe("M0,20L25,0M75,0L100,20");
  });

  test("runs a flat series through the middle", () => {
    expect(sparklinePath([5, 5, 5], 100, 20)).toBe("M0,10L50,10L100,10");
  });

  test("draws a single value as a point", () => {
    expect(sparklinePath([5], 100, 20)).toBe("M0,10");
  });

  test("is empty without values", () => {
    expect(sparklinePath([], 100, 20)).toBe("");
    expect(sparklinePath([null, null], 100, 20)).toBe("");
  });
});
