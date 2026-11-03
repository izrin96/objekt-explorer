import { describe, expect, test } from "bun:test";

import { mergeRulePages } from "./rule-layout";

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
