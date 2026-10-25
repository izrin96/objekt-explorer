import { describe, expect, test } from "bun:test";

import { ruleGroups } from "./rule-groups";

const c = (slug: string, season: string, collectionNo: string) => ({ slug, season, collectionNo });

describe("ruleGroups", () => {
  test("an any-season rule keeps each season's number apart, by number then season", () => {
    const groups = ruleGroups(
      [
        c("b117-a", "Binary01", "117Z"),
        c("a118-a", "Atom01", "118Z"),
        c("a117-a", "Atom01", "117Z"),
        c("a117-b", "Atom01", "117Z"),
      ],
      (col) => col.slug,
      new Set(["a117-a", "b117-a"]),
    );
    expect(groups.map((g) => [g.season, g.collectionNo, g.canMatch, g.objekts])).toEqual([
      ["Atom01", "117Z", 1, ["a117-a", "a117-b"]],
      ["Binary01", "117Z", 1, ["b117-a"]],
      ["Atom01", "118Z", 0, ["a118-a"]],
    ]);
  });

  test("a collection with no objekt to show is left out", () => {
    expect(ruleGroups([c("x", "Cream02", "117Z")], () => undefined, new Set(["x"]))).toEqual([]);
  });
});
