import { describe, expect, test } from "bun:test";

import { countOf, groupRows, mergeCounts, stepCount, takeOut, totalOf } from "./quantity";

type Counted = { key: string; count?: number };
const any: Counted = { key: "any:204z" };
const specific: Counted = { key: "537" };

describe("totalOf", () => {
  test("an any-copy pick counts its copies, any other pick one", () => {
    expect(totalOf([{ ...any, count: 3 }, specific])).toBe(4);
  });
});

describe("stepCount", () => {
  test("a pick not held joins at one", () => {
    const next = stepCount(new Map(), any, 1, 3, 50);
    expect(countOf(next.get(any.key)!)).toBe(1);
  });

  test("stops at the copies spare", () => {
    const held = new Map([[any.key, { ...any, count: 3 }]]);
    expect(stepCount(held, any, 1, 3, 50).get(any.key)?.count).toBe(3);
  });

  test("stops at the side's limit", () => {
    const held = new Map<string, Counted>([
      [any.key, { ...any, count: 2 }],
      [specific.key, specific],
    ]);
    expect(stepCount(held, any, 1, 9, 3).get(any.key)?.count).toBe(2);
  });

  test("a count above what is spare now can still come down", () => {
    const held = new Map([[any.key, { ...any, count: 4 }]]);
    expect(stepCount(held, any, -1, 2, 50).get(any.key)?.count).toBe(3);
  });

  test("one fewer at one takes the pick out", () => {
    const held = new Map([[any.key, any]]);
    expect(stepCount(held, any, -1, 3, 50).has(any.key)).toBe(false);
  });
});

describe("takeOut", () => {
  const ask: Counted = { key: "any:204z", count: 3 };

  test("a resolved copy takes its ask down by one", () => {
    expect(takeOut([ask], { key: "537", replaces: ask.key })).toEqual([{ ...ask, count: 2 }]);
  });

  test("an ask's unfilled rest takes it down to what was filled", () => {
    expect(takeOut([ask], { key: ask.key, count: 2 })).toEqual([{ ...ask, count: 1 }]);
  });

  test("any other row leaves whole", () => {
    expect(takeOut([ask, specific], specific)).toEqual([ask]);
    expect(takeOut([ask], ask)).toEqual([]);
  });
});

describe("groupRows", () => {
  test("repeats of one key are one row with their count, in first-seen order", () => {
    const rows = groupRows(["any:a", "1", "any:a"], (key) => key);
    expect(rows.map((row) => [row.key, row.count])).toEqual([
      ["any:a", 2],
      ["1", 1],
    ]);
  });
});

describe("mergeCounts", () => {
  test("the same any copy twice is one pick of two", () => {
    expect(mergeCounts([any, specific, any])).toEqual([{ ...any, count: 2 }, specific]);
  });
});
