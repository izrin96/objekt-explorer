import { describe, expect, test } from "bun:test";

import { mergeRulePages, ruleColumns, ruleRows } from "./rule-layout";

const group = (collectionNo: string, slugs: string[], season = "Atom01") => ({
  season,
  collectionNo,
  canMatch: slugs.length,
  objekts: slugs.map((slug) => ({ slug })),
});
const slugsOf = (groups: ReturnType<typeof mergeRulePages<{ slug: string }>>) =>
  groups.map((g) => [g.season, g.collectionNo, g.objekts.map((o) => o.slug)]);

describe("mergeRulePages", () => {
  test("a group cut across two pages becomes one", () => {
    const merged = mergeRulePages([
      { groups: [group("117Z", ["a", "b"])] },
      { groups: [group("117Z", ["c"]), group("118Z", ["d"])] },
    ]);
    expect(slugsOf(merged)).toEqual([
      ["Atom01", "117Z", ["a", "b", "c"]],
      ["Atom01", "118Z", ["d"]],
    ]);
  });

  test("the same number of another season stays its own group", () => {
    const merged = mergeRulePages([
      { groups: [group("117Z", ["a"])] },
      { groups: [group("117Z", ["b"], "Binary01")] },
    ]);
    expect(merged).toHaveLength(2);
  });

  test("a collection a shifted page sends again shows once", () => {
    const merged = mergeRulePages([
      { groups: [group("117Z", ["a", "b"])] },
      { groups: [group("117Z", ["b", "c"])] },
    ]);
    expect(slugsOf(merged)).toEqual([["Atom01", "117Z", ["a", "b", "c"]]]);
  });

  test("no pages, no groups", () => {
    expect(mergeRulePages([])).toEqual([]);
  });
});

describe("ruleColumns", () => {
  test("four at the least", () => {
    expect(ruleColumns(0)).toBe(4);
    expect(ruleColumns(300)).toBe(4);
  });

  test("one column per 96px card and 8px gap", () => {
    expect(ruleColumns(8 * 104 - 8)).toBe(8);
    expect(ruleColumns(8 * 104 - 9)).toBe(7);
  });
});

describe("ruleRows", () => {
  const g = (collectionNo: string, n: number) => ({
    season: "Atom01",
    collectionNo,
    objekts: Array.from({ length: n }, (_, i) => `${collectionNo}-${i}`),
  });

  test("headed: a heading per group, then its cards cut to the column count", () => {
    const rows = ruleRows([g("117Z", 5), g("118Z", 2)], true, 4);
    expect(rows.map((r) => [r.type, r.key])).toEqual([
      ["heading", "Atom01 117Z"],
      ["cards", "Atom01 117Z:0"],
      ["cards", "Atom01 117Z:4"],
      ["heading", "Atom01 118Z"],
      ["cards", "Atom01 118Z:0"],
    ]);
    expect(rows.filter((r) => r.type === "heading").map((r) => r.first)).toEqual([true, false]);
    expect(rows[2]).toMatchObject({ objekts: ["117Z-4"] });
  });

  test("not headed: one run of cards across groups", () => {
    const rows = ruleRows([g("117Z", 3), g("118Z", 3)], false, 4);
    expect(rows).toEqual([
      { type: "cards", key: "all:0", objekts: ["117Z-0", "117Z-1", "117Z-2", "118Z-0"] },
      { type: "cards", key: "all:4", objekts: ["118Z-1", "118Z-2"] },
    ]);
  });

  test("no groups, no rows", () => {
    expect(ruleRows([], true, 4)).toEqual([]);
    expect(ruleRows([], false, 4)).toEqual([]);
  });
});
