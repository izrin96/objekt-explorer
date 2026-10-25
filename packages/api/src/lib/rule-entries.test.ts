import { describe, expect, test } from "bun:test";

import { ruleEntryDiff } from "./rule-entries";

const rows = (...pairs: [number, string | null][]) => pairs.map(([id, slug]) => ({ id, slug }));

describe("ruleEntryDiff", () => {
  test("keeps rows still wanted, deletes the rest and inserts what is missing", () => {
    expect(ruleEntryDiff(rows([1, "a"], [2, "b"]), ["b", "c"])).toEqual({
      stale: [1],
      missing: ["c"],
    });
  });

  test("an unchanged rule writes nothing, so every id survives", () => {
    expect(ruleEntryDiff(rows([1, "a"], [2, "b"]), ["a", "b"])).toEqual({
      stale: [],
      missing: [],
    });
  });

  test("a new rule inserts each slug once", () => {
    expect(ruleEntryDiff([], ["a", "b", "a"])).toEqual({ stale: [], missing: ["a", "b"] });
  });

  test("a rule that now wants nothing deletes every row", () => {
    expect(ruleEntryDiff(rows([1, "a"], [2, "b"]), [])).toEqual({ stale: [1, 2], missing: [] });
  });

  test("a row with no slug is always deleted", () => {
    expect(ruleEntryDiff(rows([1, null], [2, "a"]), ["a"])).toEqual({ stale: [1], missing: [] });
  });
});
