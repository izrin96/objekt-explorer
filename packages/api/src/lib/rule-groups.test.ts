import { describe, expect, test } from "bun:test";

import { ruleGroups, rulePage, showsHeadings } from "./rule-groups";

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

describe("showsHeadings", () => {
  const groups = (...sizes: number[]) =>
    sizes.map((size) => ({ objekts: Array.from({ length: size }) }));

  test("one collection reads flat, however many members", () => {
    expect(showsHeadings(groups(24))).toBe(false);
  });

  test("several collections of every member get headings", () => {
    expect(showsHeadings(groups(24, 24, 24, 24))).toBe(true);
  });

  test("one or two chosen members a collection read flat", () => {
    expect(showsHeadings(groups(1, 1, 1, 1, 1, 1, 1, 1))).toBe(false);
    expect(showsHeadings(groups(2, 2, 2))).toBe(false);
  });

  test("three a collection is enough", () => {
    expect(showsHeadings(groups(3, 3))).toBe(true);
  });
});

describe("rulePage", () => {
  const m = (slug: string, season: string, collectionNo: string, member: string) => ({
    slug,
    season,
    collectionNo,
    member,
  });
  // as the indexer returns them: by number and member only, seasons interleaved
  const covered = [
    m("b117-a", "Binary01", "117Z", "A"),
    m("a117-a", "Atom01", "117Z", "A"),
    m("a117-b", "Atom01", "117Z", "B"),
    m("b117-b", "Binary01", "117Z", "B"),
    m("a118-a", "Atom01", "118Z", "A"),
    m("a118-b", "Atom01", "118Z", "B"),
  ];
  const wanted = new Set(["a117-a", "a117-b", "b117-b", "a118-b"]);
  const slugs = (page: ReturnType<typeof rulePage<(typeof covered)[number]>>) =>
    page.groups.map((g) => [g.season, g.collectionNo, g.canMatch, g.objekts.map((o) => o.slug)]);

  test("pages in group order, a group cut across pages keeping its whole count", () => {
    const first = rulePage(covered, wanted, { limit: 3 });
    expect(slugs(first)).toEqual([
      ["Atom01", "117Z", 2, ["a117-a", "a117-b"]],
      ["Binary01", "117Z", 1, ["b117-a"]],
    ]);
    expect(first.nextCursor).toBe(3);

    const second = rulePage(covered, wanted, { cursor: 3, limit: 3 });
    expect(slugs(second)).toEqual([
      ["Binary01", "117Z", 1, ["b117-b"]],
      ["Atom01", "118Z", 1, ["a118-a", "a118-b"]],
    ]);
    expect(second.nextCursor).toBeUndefined();
  });

  test("the same order whatever order the collections come in", () => {
    const shuffled = [...covered].reverse();
    expect(slugs(rulePage(shuffled, wanted, { limit: 3 }))).toEqual(
      slugs(rulePage(covered, wanted, { limit: 3 })),
    );
  });

  test("headings are decided over the whole rule, not the page", () => {
    const one = [m("x1", "Atom01", "117Z", "A"), m("x2", "Atom01", "117Z", "B")];
    const many = [...one, ...["C", "D"].map((member) => m(`x${member}`, "Atom01", "117Z", member))];
    const rule = [
      ...many,
      ...["A", "B", "C", "D"].map((member) => m(`y${member}`, "Atom01", "118Z", member)),
    ];
    expect(rulePage(rule, new Set(), { limit: 2 }).headed).toBe(true);
    expect(rulePage(many, new Set(), { limit: 2 }).headed).toBe(false);
  });

  test("past the end is an empty last page", () => {
    expect(rulePage(covered, wanted, { cursor: 10 })).toMatchObject({
      groups: [],
      nextCursor: undefined,
    });
  });
});
