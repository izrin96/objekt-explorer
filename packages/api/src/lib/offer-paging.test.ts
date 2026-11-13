import { describe, expect, test } from "bun:test";

import { orderByCollection, pageByCollection } from "./offer-paging";

const row = (collectionSlug: string, serial: number | null, objektId?: string | null) => ({
  collectionSlug,
  serial,
  objektId: objektId === undefined ? `${collectionSlug}-${serial}` : objektId,
});
const run = (slug: string, n: number) => Array.from({ length: n }, (_, i) => row(slug, i + 1));
const slugs = (items: { collectionSlug: string }[]) => [
  ...new Set(items.map((i) => i.collectionSlug)),
];

describe("orderByCollection", () => {
  test("collections keep first-seen order, the any item leads, serials ascend", () => {
    const ordered = orderByCollection([
      row("b", 9),
      row("a", 2),
      row("b", null, null),
      row("a", 1),
      row("b", 3),
    ]);
    expect(ordered.map((i) => [i.collectionSlug, i.serial])).toEqual([
      ["b", null],
      ["b", 3],
      ["b", 9],
      ["a", 1],
      ["a", 2],
    ]);
  });

  test("a copy without a serial comes last in its collection", () => {
    const ordered = orderByCollection([row("a", null, "t1"), row("a", 5)]);
    expect(ordered.map((i) => i.serial)).toEqual([5, null]);
  });
});

describe("pageByCollection", () => {
  test("a page ends at the last collection boundary at or below the size", () => {
    const items = [...run("a", 120), ...run("b", 70), ...run("c", 50)];
    const first = pageByCollection(items, 0, 200);
    expect(first.page).toHaveLength(190);
    expect(first.nextOffset).toBe(190);
    const second = pageByCollection(items, 190, 200);
    expect(slugs(second.page)).toEqual(["c"]);
    expect(second.nextOffset).toBeNull();
  });

  test("a boundary exactly at the size ends the page there", () => {
    const items = [...run("a", 100), ...run("b", 100), ...run("c", 1)];
    expect(pageByCollection(items, 0, 200).nextOffset).toBe(200);
  });

  test("a collection over the size is a page of its own", () => {
    const items = [...run("a", 10), ...run("big", 250), ...run("c", 5)];
    const first = pageByCollection(items, 0, 200);
    expect(slugs(first.page)).toEqual(["a"]);
    const big = pageByCollection(items, first.nextOffset!, 200);
    expect(slugs(big.page)).toEqual(["big"]);
    expect(big.page).toHaveLength(250);
    const last = pageByCollection(items, big.nextOffset!, 200);
    expect(slugs(last.page)).toEqual(["c"]);
    expect(last.nextOffset).toBeNull();
  });

  test("a first collection over the size is a page of its own", () => {
    const items = [...run("big", 201), ...run("b", 1)];
    const first = pageByCollection(items, 0, 200);
    expect(first.page).toHaveLength(201);
    expect(first.nextOffset).toBe(201);
  });

  test("everything that fits is one page with no next", () => {
    const items = [...run("a", 3), ...run("b", 4)];
    expect(pageByCollection(items, 0, 200)).toEqual({ page: items, nextOffset: null });
  });

  test("no page splits a collection, whatever the sizes", () => {
    const items = Array.from({ length: 40 }, (_, i) => run(`c${i}`, ((i * 7) % 23) + 1)).flat();
    let offset = 0 as number | null;
    const seen: string[] = [];
    while (offset !== null) {
      const { page, nextOffset } = pageByCollection(items, offset, 50);
      seen.push(...slugs(page));
      offset = nextOffset;
    }
    expect(seen).toEqual(slugs(items));
  });

  test("an offset past the end is an empty last page", () => {
    expect(pageByCollection(run("a", 3), 3, 200)).toEqual({ page: [], nextOffset: null });
  });
});
