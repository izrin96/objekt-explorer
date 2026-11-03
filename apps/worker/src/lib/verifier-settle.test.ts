import { describe, expect, test } from "bun:test";

import { type LegResult, legTransferable } from "@repo/api/lib/trade-match";

import { applyStuck, partitionOpenLegs, tradeNeedsSettle } from "./verifier-settle";

type TestLeg = {
  id: number;
  objekt_id: string | null;
  untransferable_at: string | null;
  away_at: string | null;
};

const leg = (id: number, over: Partial<TestLeg> = {}): TestLeg => ({
  id,
  objekt_id: "obj",
  untransferable_at: null,
  away_at: null,
  ...over,
});

const verified: LegResult = {
  kind: "verified",
  transferId: "t",
  txHash: "0xa",
  objektId: "1",
  at: "2026-11-01T10:00:00.000Z",
};
const broken: LegResult = { kind: "broken", transferId: "t", at: "2026-11-01T10:00:00.000Z" };

/** The closure the verifier builds: the indexer's reading, through `legTransferable`. */
const readings = (
  results: Map<number, LegResult>,
  byObjekt: Record<string, boolean | undefined>,
) => {
  return (l: TestLeg) =>
    l.objekt_id === null ? undefined : legTransferable(results.get(l.id), byObjekt[l.objekt_id]);
};

describe("applyStuck", () => {
  test("a pending specific leg whose objekt is not transferable becomes stuck", () => {
    const results = new Map<number, LegResult>([[1, { kind: "pending" }]]);
    applyStuck([leg(1)], results, readings(results, { obj: false }));
    expect(results.get(1)).toEqual({ kind: "stuck" });
  });

  test("a leg with awaySince stays pending, as its objekt is not the giver's", () => {
    const results = new Map<number, LegResult>([
      [1, { kind: "pending", awaySince: "2026-11-01T10:00:00.000Z" }],
    ]);
    applyStuck([leg(1)], results, readings(results, { obj: false }));
    expect(results.get(1)).toEqual({ kind: "pending", awaySince: "2026-11-01T10:00:00.000Z" });
  });

  test("an any-copy leg and a verified leg are unchanged while a specific pending one turns stuck", () => {
    const results = new Map<number, LegResult>([
      [1, { kind: "pending" }],
      [2, verified],
      [3, { kind: "pending" }],
    ]);
    applyStuck(
      [leg(1, { objekt_id: null }), leg(2), leg(3)],
      results,
      readings(results, { obj: false }),
    );
    expect(results.get(1)).toEqual({ kind: "pending" });
    expect(results.get(2)).toEqual(verified);
    expect(results.get(3)).toEqual({ kind: "stuck" });
  });
});

describe("tradeNeedsSettle", () => {
  const needs = (
    legs: TestLeg[],
    entries: [number, LegResult][],
    byObjekt: Record<string, boolean | undefined> = { obj: undefined },
    misses = 0,
  ) => {
    const results = new Map(entries);
    return tradeNeedsSettle(legs, results, readings(results, byObjekt), misses);
  };

  test("only plain pending legs and no misses skips", () => {
    expect(
      needs(
        [leg(1), leg(2)],
        [
          [1, { kind: "pending" }],
          [2, { kind: "pending" }],
        ],
      ),
    ).toBe(false);
  });

  test("a verified or broken leg settles", () => {
    expect(needs([leg(1)], [[1, verified]])).toBe(true);
    expect(needs([leg(1)], [[1, broken]])).toBe(true);
  });

  test("a leg already marked stuck and still stuck skips", () => {
    const l = leg(1, { untransferable_at: "2026-11-01 10:00:00+00" });
    expect(needs([l], [[1, { kind: "stuck" }]], { obj: false })).toBe(false);
  });

  test("a newly stuck leg settles", () => {
    expect(needs([leg(1)], [[1, { kind: "stuck" }]], { obj: false })).toBe(true);
  });

  test("a marked leg that reads transferable again settles", () => {
    const l = leg(1, { untransferable_at: "2026-11-01 10:00:00+00" });
    expect(needs([l], [[1, { kind: "pending" }]], { obj: true })).toBe(true);
  });

  test("the same away_at in DB text format skips", () => {
    const l = leg(1, { away_at: "2026-11-01 10:00:00+00" });
    const away: LegResult = { kind: "pending", awaySince: "2026-11-01T10:00:00.000Z" };
    expect(needs([l], [[1, away]])).toBe(false);
  });

  test("the same away_at in ISO format skips", () => {
    const l = leg(1, { away_at: "2026-11-01T10:00:00.000Z" });
    const away: LegResult = { kind: "pending", awaySince: "2026-11-01T10:00:00Z" };
    expect(needs([l], [[1, away]])).toBe(false);
  });

  test("a new or different awaySince settles", () => {
    const away: LegResult = { kind: "pending", awaySince: "2026-11-01T10:00:00.000Z" };
    expect(needs([leg(1)], [[1, away]])).toBe(true);
    const moved = leg(1, { away_at: "2026-11-01 09:00:00+00" });
    expect(needs([moved], [[1, away]])).toBe(true);
  });

  test("an objekt back with away_at still set settles", () => {
    const l = leg(1, { away_at: "2026-11-01 10:00:00+00" });
    expect(needs([l], [[1, { kind: "pending" }]])).toBe(true);
  });

  test("no decided legs but one unrecorded miss settles", () => {
    expect(needs([leg(1)], [[1, { kind: "pending" }]], { obj: undefined }, 1)).toBe(true);
  });
});

describe("partitionOpenLegs", () => {
  test("a leg closed since load appears nowhere", () => {
    const results = new Map<number, LegResult>([[1, verified]]);
    expect(partitionOpenLegs([leg(1)], results, new Set())).toEqual([]);
  });

  test("a leg with no result is pending and waits", () => {
    const parts = partitionOpenLegs([leg(1)], new Map(), new Set([1]));
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ result: { kind: "pending" }, record: false });
  });

  test("a verified leg is recorded", () => {
    const parts = partitionOpenLegs([leg(1)], new Map([[1, verified]]), new Set([1]));
    expect(parts[0]).toMatchObject({ result: verified, record: true });
  });

  test("keeps leg order, whatever the result", () => {
    const results = new Map<number, LegResult>([
      [3, verified],
      [1, broken],
    ]);
    const parts = partitionOpenLegs([leg(3), leg(2), leg(1)], results, new Set([1, 2, 3]));
    expect(parts.map((p) => [p.leg.id, p.record])).toEqual([
      [3, true],
      [2, false],
      [1, false],
    ]);
  });
});
