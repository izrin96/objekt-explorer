import { describe, expect, test } from "bun:test";

import { V1_CUTOFF_MS } from "./serial-math";
import {
  atRiskBatches,
  batchEdges,
  type BatchEdges,
  edgeTokens,
  isRecent,
  judgeEdges,
} from "./verify-plan";

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

describe("atRiskBatches", () => {
  const a = { start: 100, end: 199 };
  const b = { start: 300, end: 399 };
  const before = new Date(V1_CUTOFF_MS - 1000).toISOString();
  const after = new Date(V1_CUTOFF_MS + 1000).toISOString();

  test("a batch with an anchor inside is shielded", () => {
    expect(atRiskBatches([a, b], [{ tokenId: 150 }], [])).toEqual([b]);
  });

  test("a pre-cutoff objekt with a serial shields its batch", () => {
    expect(atRiskBatches([a, b], [], [{ id: "310", serial: 11, mintedAt: before }])).toEqual([a]);
  });

  test("a post-cutoff objekt, or one with no serial yet, shields nothing", () => {
    const rows = [
      { id: "110", serial: 11, mintedAt: after },
      { id: "320", serial: 0, mintedAt: before },
    ];
    expect(atRiskBatches([a, b], [], rows)).toEqual([a, b]);
  });

  test("an anchor on either stored edge counts as inside", () => {
    expect(atRiskBatches([a, b], [{ tokenId: 199 }, { tokenId: 300 }], [])).toEqual([]);
  });
});

describe("batchEdges", () => {
  const a = { start: 100, end: 199 };
  const frontier = { start: 300, end: 399 };

  test("a batch with mints inside both edges also names the gap tokens next to them", () => {
    expect(batchEdges([a], frontier, [120, 150, 180])).toEqual([
      { end: 199, endNext: 200, start: 100, startPrev: 99, afterOurs: 181, beforeOurs: 119 },
    ]);
  });

  test("mints on the stored edges leave no gap tokens", () => {
    expect(batchEdges([a], frontier, [100, 199])).toEqual([
      { end: 199, endNext: 200, start: 100, startPrev: 99, afterOurs: null, beforeOurs: null },
    ]);
  });

  test("a batch with none of our mints has only its stored edges", () => {
    expect(batchEdges([a], frontier, [350])).toEqual([
      { end: 199, endNext: 200, start: 100, startPrev: 99, afterOurs: null, beforeOurs: null },
    ]);
  });

  test("the frontier batch gets only its start side", () => {
    expect(batchEdges([frontier], frontier, [320, 340])).toEqual([
      { end: null, endNext: null, start: 300, startPrev: 299, afterOurs: null, beforeOurs: 319 },
    ]);
  });
});

describe("edgeTokens", () => {
  test("lists each token once and drops absent ones and those below 1", () => {
    const edges: BatchEdges[] = [
      { end: 99, endNext: 100, start: 1, startPrev: 0, afterOurs: 51, beforeOurs: null },
      { end: null, endNext: null, start: 100, startPrev: 99, afterOurs: null, beforeOurs: 120 },
    ];
    expect(edgeTokens(edges).toSorted((x, y) => x - y)).toEqual([1, 51, 99, 100, 120]);
  });
});
