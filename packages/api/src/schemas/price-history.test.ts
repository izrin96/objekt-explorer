import { describe, expect, test } from "bun:test";

import {
  floorChange,
  historyCacheSeconds,
  rangeStart,
  rangesLocked,
  utcDate,
} from "./price-history";

describe("utcDate", () => {
  test("rolls over at midnight UTC", () => {
    expect(utcDate(new Date("2026-10-13T23:59:59.999Z"))).toBe("2026-10-13");
    expect(utcDate(new Date("2026-10-14T00:00:00.000Z"))).toBe("2026-10-14");
  });
});

describe("historyCacheSeconds", () => {
  test("waits for the next minute 10", () => {
    expect(historyCacheSeconds(new Date("2026-10-13T08:04:59Z"))).toBe(301);
    expect(historyCacheSeconds(new Date("2026-10-13T08:09:59Z"))).toBe(1);
  });

  test("waits a full hour at minute 10", () => {
    expect(historyCacheSeconds(new Date("2026-10-13T08:10:00Z"))).toBe(3600);
  });

  test("runs past the hour", () => {
    expect(historyCacheSeconds(new Date("2026-10-13T08:59:00Z"))).toBe(11 * 60);
  });
});

describe("rangeStart", () => {
  const now = new Date("2026-10-13T12:00:00Z");

  test("counts today as the first day", () => {
    expect(rangeStart("7d", now)).toBe("2026-10-07");
    expect(rangeStart("30d", now)).toBe("2026-09-14");
    expect(rangeStart("90d", now)).toBe("2026-07-16");
  });

  test("has no start for all", () => {
    expect(rangeStart("all", now)).toBeNull();
  });

  test("crosses a month end", () => {
    const early = new Date("2026-03-02T00:30:00Z");
    expect(rangeStart("7d", early)).toBe("2026-02-24");
    expect(rangeStart("30d", early)).toBe("2026-02-01");
    expect(rangeStart("90d", early)).toBe("2025-12-03");
  });

  test("uses the UTC day near midnight", () => {
    expect(rangeStart("7d", new Date("2026-10-13T23:59:59Z"))).toBe("2026-10-07");
    expect(rangeStart("7d", new Date("2026-10-14T00:00:00Z"))).toBe("2026-10-08");
  });
});

describe("floorChange", () => {
  test("rises", () => {
    expect(floorChange(10, 12)).toBeCloseTo(0.2);
  });

  test("falls", () => {
    expect(floorChange(10, 8)).toBeCloseTo(-0.2);
  });

  test("is null without two prices or from zero", () => {
    expect(floorChange(null, 5)).toBeNull();
    expect(floorChange(5, null)).toBeNull();
    expect(floorChange(0, 5)).toBeNull();
  });
});

describe("rangesLocked", () => {
  const now = new Date("2026-10-13T12:00:00Z");

  test("locks while the history spans 7 days", () => {
    expect(rangesLocked("2026-10-13", now)).toBe(true);
    expect(rangesLocked("2026-10-07", now)).toBe(true);
  });

  test("opens at 8 days", () => {
    expect(rangesLocked("2026-10-06", now)).toBe(false);
  });
});
