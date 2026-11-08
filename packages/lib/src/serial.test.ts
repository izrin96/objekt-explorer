import { describe, expect, test } from "bun:test";

import {
  dropStillMinting,
  estimateSerials,
  isGridDrop,
  isSerialEstimated,
  OPEN_DROP_DAYS,
  shownSerial,
  V1_CUTOFF_MS,
} from "./serial";

describe("isSerialEstimated", () => {
  test("before the cutoff is Cosmo's serial", () => {
    expect(isSerialEstimated(new Date(V1_CUTOFF_MS - 1))).toBe(false);
  });

  test("at and after the cutoff is estimated", () => {
    expect(isSerialEstimated(new Date(V1_CUTOFF_MS))).toBe(true);
    expect(isSerialEstimated("2026-09-01T00:00:00Z")).toBe(true);
  });
});

describe("shownSerial", () => {
  test("0 is not numbered yet", () => {
    expect(shownSerial(0)).toBeNull();
    expect(shownSerial(537)).toBe(537);
  });
});

describe("estimateSerials", () => {
  const one = (start: number, end: number) => [{ start, end }];

  test("a serial above the ranges' total floors it: ranges went unseen", () => {
    expect(
      estimateSerials({ season: "Summer25", batches: one(1, 500), ceiling: 501, topSerial: 600 }),
    ).toEqual({ min: 600, max: null });
  });

  test("a serial inside the range raises only its low end", () => {
    expect(
      estimateSerials({ season: "Atom02", batches: one(1, 437), ceiling: 520, topSerial: 450 }),
    ).toEqual({ min: 450, max: 519 });
  });

  test("a last range closed by a foreign token is exact", () => {
    expect(
      estimateSerials({ season: "Cream02", batches: one(1, 500), ceiling: 501, topSerial: 0 }),
    ).toEqual({
      min: 500,
      max: 500,
    });
  });

  test("closed ranges count as they are", () => {
    const batches = [
      { start: 1, end: 100 },
      { start: 103, end: 202 },
      { start: 205, end: 250 },
    ];
    expect(estimateSerials({ season: "Summer26", batches, ceiling: 256, topSerial: 0 })).toEqual({
      min: 250,
      max: 250,
    });
  });

  test("a block-season last range rounds up to 100 when it lands on the ceiling", () => {
    expect(
      estimateSerials({ season: "Atom02", batches: one(1, 437), ceiling: 502, topSerial: 0 }),
    ).toEqual({
      min: 500,
      max: 500,
    });
  });

  test("50 when 100 does not fit", () => {
    expect(
      estimateSerials({ season: "Atom02", batches: one(1, 337), ceiling: 352, topSerial: 0 }),
    ).toEqual({
      min: 350,
      max: 350,
    });
  });

  test("a narrow gap that rounding misses is a range", () => {
    expect(
      estimateSerials({ season: "Atom02", batches: one(1, 437), ceiling: 480, topSerial: 0 }),
    ).toEqual({
      min: 437,
      max: 479,
    });
  });

  test("a gap wider than 100 shows the low end only", () => {
    expect(
      estimateSerials({ season: "Atom02", batches: one(1, 437), ceiling: 900, topSerial: 0 }),
    ).toEqual({
      min: 437,
      max: null,
    });
  });

  test("older seasons never round", () => {
    expect(
      estimateSerials({ season: "Ever01", batches: one(1, 437), ceiling: 502, topSerial: 0 }),
    ).toEqual({
      min: 437,
      max: 501,
    });
  });

  test("no ceiling found shows the low end only", () => {
    expect(
      estimateSerials({ season: "Summer26", batches: one(1, 40), ceiling: null, topSerial: 0 }),
    ).toEqual({
      min: 40,
      max: null,
    });
  });

  const est = (season: string, length: number, ceiling: number | null, topSerial = 0) =>
    estimateSerials({ season, batches: one(1, length), ceiling, topSerial });

  test("the largest block under the ceiling, even well past the newest mint", () => {
    expect(est("Atom02", 437, 602)).toEqual({ min: 600, max: 600 });
  });

  test("a block rounds within 3 tokens of the ceiling, not 4", () => {
    expect(est("Atom02", 437, 504)).toEqual({ min: 500, max: 500 });
    expect(est("Atom02", 437, 505)).toEqual({ min: 437, max: 504 });
  });

  test("a range up to 100 wide is shown, 101 is the low end only", () => {
    expect(est("Ever01", 437, 538)).toEqual({ min: 437, max: 537 });
    expect(est("Ever01", 437, 539)).toEqual({ min: 437, max: null });
  });

  test("an older season within 3 tokens of the ceiling is exact", () => {
    expect(est("Ever01", 437, 441)).toEqual({ min: 437, max: 437 });
  });

  test("a serial at the range's top stays inside it", () => {
    expect(est("Ever01", 437, 480, 479)).toEqual({ min: 479, max: 479 });
    expect(est("Ever01", 437, 480, 480)).toEqual({ min: 480, max: null });
  });

  test("Atom01 and a collection with no ranges get none", () => {
    expect(
      estimateSerials({ season: "Atom01", batches: one(1, 40), ceiling: 41, topSerial: 0 }),
    ).toBeNull();
    expect(
      estimateSerials({ season: "Cream02", batches: [], ceiling: null, topSerial: 0 }),
    ).toBeNull();
  });
});

describe("isGridDrop", () => {
  test("an offline A collection of a block season", () => {
    expect(isGridDrop({ season: "Cream02", collectionNo: "355A", onOffline: "offline" })).toBe(
      true,
    );
  });

  test("a Z collection, an online one and a pre-block season are not", () => {
    expect(isGridDrop({ season: "Cream02", collectionNo: "107Z", onOffline: "offline" })).toBe(
      false,
    );
    expect(isGridDrop({ season: "Cream02", collectionNo: "355A", onOffline: "online" })).toBe(
      false,
    );
    expect(isGridDrop({ season: "Cream01", collectionNo: "305A", onOffline: "offline" })).toBe(
      false,
    );
  });
});

describe("dropStillMinting", () => {
  const firstCreatedAt = "2026-11-08T01:38:03Z";
  const at = (hours: number) => Date.parse(firstCreatedAt) + hours * 60 * 60 * 1000;

  test("an unfitted drop under the window is open", () => {
    expect(dropStillMinting({ fitted: false, firstCreatedAt, now: at(4) })).toBe(true);
  });

  test("a fitted drop is closed", () => {
    expect(dropStillMinting({ fitted: true, firstCreatedAt, now: at(4) })).toBe(false);
  });

  test("the window closes at exactly OPEN_DROP_DAYS", () => {
    const edge = OPEN_DROP_DAYS * 24;
    expect(dropStillMinting({ fitted: false, firstCreatedAt, now: at(edge) - 1 })).toBe(true);
    expect(dropStillMinting({ fitted: false, firstCreatedAt, now: at(edge) })).toBe(false);
  });
});

describe("estimateSerials for an open drop", () => {
  const input = { season: "Cream02", batches: [{ start: 1, end: 437 }], ceiling: 501 };

  test("open ignores the ceiling: at least the stored ranges", () => {
    expect(estimateSerials({ ...input, topSerial: 0 })).toEqual({ min: 500, max: 500 });
    expect(estimateSerials({ ...input, topSerial: 0, open: true })).toEqual({
      min: 437,
      max: null,
    });
  });

  test("a known serial still floors min", () => {
    expect(estimateSerials({ ...input, topSerial: 520, open: true })).toEqual({
      min: 520,
      max: null,
    });
  });
});
