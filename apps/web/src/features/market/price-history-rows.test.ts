import { describe, expect, test } from "bun:test";

import { type HistoryPoint, toRows } from "./price-history-rows";

const point = (date: string, floorUsd: number, listingCount = 3): HistoryPoint => ({
  date,
  floorUsd,
  medianUsd: floorUsd + 1,
  listingCount,
});

const same = (usd: number) => usd;

describe("toRows", () => {
  test("has a row for every day to today", () => {
    const rows = toRows([point("2026-10-01", 5), point("2026-10-02", 6)], null, "2026-10-03", same);
    expect(rows.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(rows[1]).toEqual({
      date: "2026-10-02",
      floor: 6,
      median: 7,
      listings: 3,
      bridge: null,
    });
    expect(rows[2]).toEqual({
      date: "2026-10-03",
      floor: null,
      median: null,
      listings: null,
      bridge: null,
    });
  });

  test("bridges the recorded days around a gap", () => {
    const rows = toRows([point("2026-10-01", 5), point("2026-10-04", 8)], null, "2026-10-04", same);
    expect(rows.map((r) => r.bridge)).toEqual([5, 6, 7, 8]);
    expect(rows[1]!.floor).toBeNull();
    expect(rows[1]!.listings).toBeNull();
  });

  test("bridges two gaps in a row", () => {
    const rows = toRows(
      [point("2026-10-01", 5), point("2026-10-03", 6), point("2026-10-05", 7)],
      null,
      "2026-10-05",
      same,
    );
    expect(rows.map((r) => r.bridge)).toEqual([5, 5.5, 6, 6.5, 7]);
  });

  test("leaves a recorded day between two gaps out of the bridge", () => {
    const rows = toRows(
      [
        point("2026-10-01", 4),
        point("2026-10-03", 6),
        point("2026-10-04", 7),
        point("2026-10-05", 8),
        point("2026-10-07", 10),
      ],
      null,
      "2026-10-07",
      same,
    );
    expect(rows.map((r) => r.bridge)).toEqual([4, 5, 6, null, 8, 9, 10]);
  });

  test("leaves days before the first record empty, without a bridge", () => {
    const rows = toRows(
      [point("2026-10-03", 5), point("2026-10-04", 6)],
      "2026-10-01",
      "2026-10-04",
      same,
    );
    expect(rows.map((r) => [r.floor, r.bridge])).toEqual([
      [null, null],
      [null, null],
      [5, null],
      [6, null],
    ]);
  });

  test("handles a single point", () => {
    const rows = toRows([point("2026-10-13", 5)], null, "2026-10-13", same);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.bridge).toBeNull();
  });

  test("has no rows without points for all", () => {
    expect(toRows([], null, "2026-10-13", same)).toEqual([]);
  });

  test("converts prices but not listing counts", () => {
    const [row] = toRows([point("2026-10-13", 10, 4)], null, "2026-10-13", (usd) => usd * 1400);
    expect(row).toMatchObject({ floor: 14000, median: 15400, listings: 4 });
  });

  test("crosses a month end", () => {
    const rows = toRows([point("2026-09-30", 5)], null, "2026-10-02", same);
    expect(rows.map((r) => r.date)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});
