import { describe, expect, test } from "bun:test";

import type { GridObjekt } from "@repo/lib/types/objekt";

import { compareSupply, filterObjekts } from "./filter-utils";
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
