import { describe, expect, test } from "bun:test";

import { type BatchEdges, isRecent, judgeEdges } from "./verify-plan";

describe("isRecent", () => {
  const now = Date.parse("2026-11-06T00:00:00Z");
  const week = 7 * 24 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;

  test("exactly 8 weeks old is recent", () => {
    expect(isRecent(now - 8 * week, now)).toBe(true);
  });

  test("8 weeks and a day old is not", () => {
    expect(isRecent(now - 8 * week - day, now)).toBe(false);
  });
});

describe("judgeEdges", () => {
  const ours = "ours-id";
  const edges = (over: Partial<BatchEdges> = {}): BatchEdges => ({
    end: 199,
    endNext: 200,
    start: 100,
    startPrev: 99,
    afterOurs: null,
    beforeOurs: null,
    ...over,
  });
  const owners = (pairs: [number, string][]) => new Map(pairs);

  test("a settled foreign end+1 needs no probe", () => {
    const j = judgeEdges(
      [edges()],
      owners([
        [199, ours],
        [200, "other"],
        [100, ours],
        [99, "other"],
      ]),
      ours,
    );
    expect(j).toEqual({ reasons: [], unknown: [], foreign: [200, 99] });
  });

  test("our own token at start-1 is drift", () => {
    const j = judgeEdges(
      [edges()],
      owners([
        [199, ours],
        [200, "other"],
        [100, ours],
        [99, ours],
      ]),
      ours,
    );
    expect(j.reasons).toEqual(["start-1 99 is ours (too small)"]);
  });

  test("a foreign gap token is drift", () => {
    const j = judgeEdges(
      [edges({ afterOurs: 150 })],
      owners([
        [199, ours],
        [200, "other"],
        [100, ours],
        [99, "other"],
        [150, "other"],
      ]),
      ours,
    );
    expect(j.reasons).toEqual(["gap token 150 after last ours is foreign (end too big)"]);
    expect(j.foreign).toContain(150);
  });

  test("tokens the indexer lacks are returned for probing", () => {
    const j = judgeEdges([edges({ beforeOurs: 120 })], owners([[100, ours]]), ours);
    expect(j.reasons).toEqual([]);
    expect(j.unknown.toSorted((a, b) => a - b)).toEqual([99, 120, 199, 200]);
  });

  test("the frontier's absent end side gives nothing", () => {
    const j = judgeEdges(
      [edges({ end: null, endNext: null })],
      owners([
        [100, ours],
        [99, "other"],
      ]),
      ours,
    );
    expect(j).toEqual({ reasons: [], unknown: [], foreign: [99] });
  });

  test("a token below 1 is foreign without a probe or a lesson", () => {
    const j = judgeEdges(
      [edges({ start: 1, startPrev: 0, end: null, endNext: null })],
      owners([[1, ours]]),
      ours,
    );
    expect(j).toEqual({ reasons: [], unknown: [], foreign: [] });
  });
});
