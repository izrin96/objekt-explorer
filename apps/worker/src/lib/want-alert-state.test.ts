import { describe, expect, test } from "bun:test";

import {
  keepMarks,
  MARK_SPACING_MS,
  OVERLAP_MS,
  overlapFloor,
  parseState,
} from "./want-alert-state";

const MIN = 60 * 1000;

function cadence(untilMinute: number) {
  let marks: [number, number][] = [];
  for (let minute = 0; minute <= untilMinute; minute += 5) {
    marks = keepMarks(marks, [minute * MIN, minute * 100]);
  }
  return marks;
}

describe("overlapFloor", () => {
  test("at a 5 minute cadence the floor is 10 minutes before the previous run", () => {
    const marks = cadence(30);
    // an entry assigned at minute 21 (id 2100) commits after the run at minute 30
    expect(overlapFloor(marks, 3000)).toBe(2000);
    expect(2100).toBeGreaterThan(overlapFloor(marks, 3000));
  });

  test("after a long gap the floor comes from before the last run, not the newest mark", () => {
    expect(overlapFloor(cadence(20), 2000)).toBe(1000);
  });

  test("the run after a gap keeps the pre-gap mark as the next anchor", () => {
    // runs stop at minute 20 and resume at minute 80
    const afterGap = keepMarks(cadence(20), [80 * MIN, 8000]);
    expect(afterGap).toContainEqual([20 * MIN, 2000]);
    expect(overlapFloor(afterGap, 8000)).toBe(2000);
    const next = keepMarks(afterGap, [85 * MIN, 8500]);
    expect(overlapFloor(next, 8500)).toBe(2000);
  });

  test("a crash loop keeps the anchor and a short list", () => {
    let marks = cadence(20);
    for (let run = 1; run <= 15; run++) {
      marks = keepMarks(marks, [20 * MIN + run * 10_000, 2000 + run]);
      expect(marks.length).toBeLessThanOrEqual(11);
    }
    const newest = marks.at(-1)![0];
    const anchor = marks.findLast(([at]) => at <= newest - OVERLAP_MS);
    expect(anchor).toBeDefined();
    expect(overlapFloor(marks, 5000)).toBe(anchor![1]);
    expect(newest - anchor![0]).toBeGreaterThanOrEqual(OVERLAP_MS);
  });

  test("a single mark is the floor, capped at the cursor", () => {
    expect(overlapFloor([[0, 500]], 900)).toBe(500);
    expect(overlapFloor([[0, 500]], 300)).toBe(300);
  });

  test("with no marks the floor is the cursor", () => {
    expect(overlapFloor([], 42)).toBe(42);
  });
});

describe("keepMarks", () => {
  test("keeps the older mark when the new one is under the spacing", () => {
    const marks: [number, number][] = [[0, 10]];
    expect(keepMarks(marks, [MARK_SPACING_MS - 1, 20])).toEqual([[0, 10]]);
    expect(keepMarks(marks, [MARK_SPACING_MS, 20])).toEqual([
      [0, 10],
      [MARK_SPACING_MS, 20],
    ]);
  });
});

describe("parseState", () => {
  test("reads a stored state", () => {
    const state = { discoverable: [1], marks: [[10, 5]], progress: [[2, 9]] };
    expect(parseState(state)).toEqual(state as never);
  });

  test("rejects a non-object and missing arrays", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("{")).toBeNull();
    expect(parseState(7)).toBeNull();
    expect(parseState({ discoverable: [] })).toBeNull();
    expect(parseState({ marks: [] })).toBeNull();
  });

  test("rejects malformed marks", () => {
    expect(parseState({ discoverable: [], marks: [[1]] })).toBeNull();
    expect(parseState({ discoverable: [], marks: [["a", 1]] })).toBeNull();
    expect(parseState({ discoverable: [], marks: [1] })).toBeNull();
  });
});
