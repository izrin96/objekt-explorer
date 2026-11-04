import { describe, expect, test } from "bun:test";

import { dayLabel, parseTradeNumber, spanParts, sharePercent } from "./format";

describe("parseTradeNumber", () => {
  test("reads T-1042, t-1042 and a bare 1042", () => {
    expect(parseTradeNumber("T-1042")).toBe(1042);
    expect(parseTradeNumber(" t-1042 ")).toBe(1042);
    expect(parseTradeNumber("1042")).toBe(1042);
    expect(parseTradeNumber("#1042")).toBe(1042);
  });

  test("anything else is no number", () => {
    expect(parseTradeNumber("")).toBeNull();
    expect(parseTradeNumber("T-")).toBeNull();
    expect(parseTradeNumber("T-0")).toBeNull();
    expect(parseTradeNumber("T-12a")).toBeNull();
    expect(parseTradeNumber("99999999999")).toBeNull();
  });
});

describe("spanParts", () => {
  test("under an hour is minutes", () => {
    expect(spanParts(40 * 60)).toEqual([{ value: 40, unit: "minute" }]);
  });

  test("under two days is hours and minutes", () => {
    expect(spanParts(88 * 60)).toEqual([
      { value: 1, unit: "hour" },
      { value: 28, unit: "minute" },
    ]);
    expect(spanParts(4.5 * 3600)).toEqual([
      { value: 4, unit: "hour" },
      { value: 30, unit: "minute" },
    ]);
    expect(spanParts(21 * 3600)).toEqual([{ value: 21, unit: "hour" }]);
  });

  test("two days or more is days and hours", () => {
    expect(spanParts(50 * 3600)).toEqual([
      { value: 2, unit: "day" },
      { value: 2, unit: "hour" },
    ]);
  });

  test("less than a minute reads as under a minute, never 0 hours", () => {
    expect(spanParts(20)).toEqual([{ value: 1, unit: "minute" }]);
  });
});

describe("dayLabel", () => {
  test("a UTC date keeps its own day whatever the viewer's zone", () => {
    expect(dayLabel("2026-10-12", "en")).toBe("Oct 12");
  });
});

describe("sharePercent", () => {
  test("a share of a total, or nothing when the total is 0", () => {
    expect(sharePercent(40, 120, "en")).toBe("33%");
    expect(sharePercent(0, 0, "en")).toBeNull();
  });
});
