import { describe, expect, test } from "bun:test";

import { fillDays, percentile, rangeDays, rangeStart, staffCopyStatus } from "./staff-totals";

describe("rangeDays", () => {
  test("7 days end with today in UTC, oldest first, across a month end", () => {
    expect(rangeDays(7, new Date("2026-11-03T05:00:00Z"))).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });

  test("a KST morning still counts the UTC day it falls in", () => {
    // 08:30 in Seoul on Nov 4 is 23:30 on Nov 3 in UTC
    expect(rangeDays(7, new Date("2026-11-03T23:30:00Z")).at(-1)).toBe("2026-11-03");
  });

  test("30 and 90 days hold that many days, today last", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const thirty = rangeDays(30, now);
    expect(thirty).toHaveLength(30);
    expect(thirty[0]).toBe("2026-01-31");
    expect(thirty.at(-1)).toBe("2026-03-01");
    const ninety = rangeDays(90, now);
    expect(ninety).toHaveLength(90);
    expect(ninety[0]).toBe("2025-12-02");
  });

  test("rangeStart is midnight UTC of the first day", () => {
    expect(rangeStart(7, new Date("2026-11-03T05:00:00Z")).toISOString()).toBe(
      "2026-10-28T00:00:00.000Z",
    );
  });
});

describe("fillDays", () => {
  const days = ["2026-10-11", "2026-10-12", "2026-10-13"];
  const keys = ["created", "declined"] as const;

  test("a quiet day shows 0 for every key", () => {
    const filled = fillDays(
      [
        { day: "2026-10-11", key: "created", count: 4 },
        { day: "2026-10-13", key: "declined", count: 2 },
      ],
      days,
      keys,
    );
    expect(filled.days[1]).toEqual({ day: "2026-10-12", counts: { created: 0, declined: 0 } });
  });

  test("the sum adds every day of the range", () => {
    const filled = fillDays(
      [
        { day: "2026-10-11", key: "created", count: 4 },
        { day: "2026-10-13", key: "created", count: 3 },
        { day: "2026-10-13", key: "declined", count: 2 },
      ],
      days,
      keys,
    );
    expect(filled.sum).toEqual({ created: 7, declined: 2 });
    expect(filled.days.map((d) => d.day)).toEqual(days);
  });

  test("an unknown key or a day outside the range is ignored", () => {
    const filled = fillDays(
      [
        { day: "2026-10-12", key: "teleported", count: 9 },
        { day: "2026-10-10", key: "created", count: 5 },
      ],
      days,
      keys,
    );
    expect(filled.sum).toEqual({ created: 0, declined: 0 });
  });
});

describe("percentile", () => {
  test("no values is no data, not 0", () => {
    expect(percentile([], 0.5)).toBeNull();
  });

  test("one value is every percentile", () => {
    expect(percentile([7], 0.5)).toBe(7);
    expect(percentile([7], 0.9)).toBe(7);
  });

  test("the spec's ten trades: median 4.5 hours, 90th percentile 21 hours", () => {
    const hours = [1, 2, 2, 3, 4, 5, 6, 8, 20, 30];
    expect(percentile(hours, 0.5)).toBe(4.5);
    expect(percentile(hours, 0.9)).toBeCloseTo(21, 9);
  });
});

describe("staffCopyStatus", () => {
  test("a copy still pending on a closed leg lapsed", () => {
    expect(staffCopyStatus("pending", false)).toBe("lapsed");
  });

  test("an open leg's pending copy waits; a decided copy keeps its decision", () => {
    expect(staffCopyStatus("pending", true)).toBe("pending");
    expect(staffCopyStatus("accepted", false)).toBe("accepted");
    expect(staffCopyStatus("declined", false)).toBe("declined");
  });
});
