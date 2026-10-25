import { describe, expect, test } from "bun:test";

import type { GridObjekt } from "@repo/lib/types/objekt";

import { compareSupply, filterObjekts, sortObjekts } from "./filter-utils";
import { filterSearchSchema } from "./search-schema";

const NOW = 1_800_000_000;
const DAY = 86_400;

function row(slug: string, extra: Record<string, unknown> = {}) {
  return { slug, ...extra } as unknown as GridObjekt;
}

describe("filterObjekts listed window", () => {
  const rows = [
    row("a", { listedAt: NOW - DAY / 2, floorPrice: 3 }),
    row("b", { listedAt: NOW - 3 * DAY, floorPrice: 1 }),
    row("c", { listedAt: NOW - 40 * DAY, floorPrice: 2 }),
    row("d", { listedAt: NOW - DAY / 2, floorPrice: null }),
  ];
  const slugs = (list: GridObjekt[]) => list.map((r) => r.slug);

  test("narrows by window and never grows as it shrinks", () => {
    const d30 = filterObjekts({ listed: "30d" }, rows, NOW);
    const d7 = filterObjekts({ listed: "7d" }, rows, NOW);
    const h24 = filterObjekts({ listed: "24h" }, rows, NOW);
    expect(slugs(d30)).toEqual(["a", "b", "d"]);
    expect(slugs(d7)).toEqual(["a", "b", "d"]);
    expect(slugs(h24)).toEqual(["a", "d"]);
  });

  test("composes with priced and a floor range", () => {
    expect(slugs(filterObjekts({ listed: "24h", priced: true }, rows, NOW))).toEqual(["a"]);
    expect(slugs(filterObjekts({ listed: "7d", floor_max: 2 }, rows, NOW))).toEqual(["b"]);
  });

  test("a row without listedAt passes", () => {
    expect(filterObjekts({ listed: "24h" }, [row("x")], NOW)).toHaveLength(1);
  });

  test("an unreadable window is dropped by the schema", () => {
    expect(filterSearchSchema.parse({ listed: "1y" }).listed).toBeUndefined();
    expect(filterSearchSchema.parse({ listed: "7d" }).listed).toBe("7d");
  });
});

describe("compareSupply", () => {
  const sort = (dir: "asc" | "desc", rows: GridObjekt[]) =>
    rows.toSorted(compareSupply(dir)).map((r) => r.slug);

  test("equal counts go cheapest first, in both directions", () => {
    const rows = [
      row("two", { listingCount: 3, floorPrice: 2 }),
      row("one", { listingCount: 3, floorPrice: 1 }),
    ];
    expect(sort("desc", rows)).toEqual(["one", "two"]);
    expect(sort("asc", rows)).toEqual(["one", "two"]);
  });

  test("unpriced goes last among equal counts", () => {
    const rows = [
      row("qyop", { listingCount: 5, floorPrice: null }),
      row("priced", { listingCount: 5, floorPrice: 9 }),
    ];
    expect(sort("desc", rows)).toEqual(["priced", "qyop"]);
    expect(sort("asc", rows)).toEqual(["priced", "qyop"]);
  });

  test("then newest listing, then slug", () => {
    const rows = [
      row("b", { listingCount: 2, floorPrice: 1, listedAt: 10 }),
      row("a", { listingCount: 2, floorPrice: 1, listedAt: 10 }),
      row("c", { listingCount: 2, floorPrice: 1, listedAt: 20 }),
    ];
    expect(sort("desc", rows)).toEqual(["c", "a", "b"]);
    expect(sort("asc", rows)).toEqual(["c", "a", "b"]);
  });

  test("the count follows the direction", () => {
    const rows = [row("few", { listingCount: 1 }), row("many", { listingCount: 4 })];
    expect(sort("desc", rows)).toEqual(["many", "few"]);
    expect(sort("asc", rows)).toEqual(["few", "many"]);
  });
});

describe("sortObjekts", () => {
  // member and season order as the artist provider gives it, not alphabetical
  const MEMBERS = ["SeoYeon", "HyeRin", "JiWoo"];
  const SEASONS = ["Atom01", "Binary01", "Cream01"];
  const compareMember = (a: string, b: string) => MEMBERS.indexOf(a) - MEMBERS.indexOf(b);
  const compareSeason = (a: string, b: string) => SEASONS.indexOf(a) - SEASONS.indexOf(b);
  const card = (slug: string, member: string, season: string, collectionNo: string, extra = {}) =>
    row(slug, { member, season, collectionNo, ...extra });
  const rows = [
    card("a", "JiWoo", "Binary01", "101Z", { entryId: 3 }),
    card("b", "SeoYeon", "Binary01", "101Z", { entryId: 1 }),
    card("c", "HyeRin", "Atom01", "110Z", { entryId: 5 }),
    card("d", "SeoYeon", "Cream01", "101Z", { entryId: 2 }),
    card("e", "JiWoo", "Atom01", "101A", { entryId: 4 }),
    card("f", "SeoYeon", "Atom01", "110Z", { entryId: 6 }),
    card("g", "HyeRin", "Binary01", "101Z", { entryId: 7 }),
  ];
  const order = (filters: Record<string, unknown>, rarity?: Map<string, number>) =>
    sortObjekts(rows, filters, compareMember, compareSeason, rarity).map((r) => r.slug);

  test("date runs newest first by default, oldest first ascending", () => {
    expect(order({})).toEqual(["g", "f", "c", "e", "a", "d", "b"]);
    expect(order({ sort: "date", sort_dir: "asc" })).toEqual(["b", "d", "a", "e", "c", "f", "g"]);
  });

  test("rare leads with the fewest copies and breaks ties by date", () => {
    const rarity = new Map([
      ["a", 5],
      ["b", 1],
      ["c", 5],
      ["d", 1],
    ]);
    expect(order({ sort: "rare", sort_dir: "asc" }, rarity)).toEqual([
      "b",
      "d",
      "a",
      "c",
      "e",
      "f",
      "g",
    ]);
    expect(order({ sort: "rare", sort_dir: "desc" }, rarity)).toEqual([
      "g",
      "f",
      "e",
      "c",
      "a",
      "d",
      "b",
    ]);
    expect(order({ sort: "rare" })).toEqual([]);
  });

  test("season sorts by season, then collection number, then member", () => {
    expect(order({ sort: "season", sort_dir: "asc" })).toEqual(["e", "f", "c", "b", "g", "a", "d"]);
    expect(order({ sort: "season", sort_dir: "desc" })).toEqual([
      "d",
      "b",
      "g",
      "a",
      "f",
      "c",
      "e",
    ]);
  });

  test("collection number sorts by number, then member", () => {
    expect(order({ sort: "collectionNo", sort_dir: "asc" })).toEqual([
      "e",
      "b",
      "d",
      "g",
      "a",
      "f",
      "c",
    ]);
    expect(order({ sort: "collectionNo", sort_dir: "desc" })).toEqual([
      "f",
      "c",
      "b",
      "d",
      "g",
      "a",
      "e",
    ]);
  });

  test("member sorts by member, then season, then collection number", () => {
    expect(order({ sort: "member", sort_dir: "asc" })).toEqual(["f", "b", "d", "c", "g", "e", "a"]);
    expect(order({ sort: "member", sort_dir: "desc" })).toEqual([
      "e",
      "a",
      "c",
      "g",
      "f",
      "b",
      "d",
    ]);
  });

  test("keeps the input order on a full tie and leaves the input alone", () => {
    const twins = [card("x", "SeoYeon", "Atom01", "101Z"), card("y", "SeoYeon", "Atom01", "101Z")];
    const sorted = sortObjekts(twins, { sort: "member" }, compareMember, compareSeason);
    expect(sorted.map((r) => r.slug)).toEqual(["x", "y"]);
    expect(sorted).not.toBe(twins);
  });
});
