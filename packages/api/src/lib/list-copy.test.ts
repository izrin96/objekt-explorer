import { describe, expect, test } from "bun:test";

import { type CopySourceEntry, buildCopyRows, type OwnedCopy } from "./list-copy";

const entry = (
  slug: string | null,
  objektId: string | null = null,
  extra: Partial<CopySourceEntry> = {},
): CopySourceEntry => ({
  collectionSlug: slug,
  objektId,
  price: null,
  isQyop: false,
  note: null,
  ...extra,
});

describe("buildCopyRows", () => {
  test("rows keeps order and duplicates", () => {
    const out = buildCopyRows("rows", [entry("a"), entry("b"), entry("a")], new Set(), false);
    expect(out.rows.map((r) => r.collectionSlug)).toEqual(["a", "b", "a"]);
    expect(out).toMatchObject({ carried: 3, leftOut: 0 });
  });

  test("distinct-collections collapses duplicates in first-seen order", () => {
    const entries = [entry("b", "1"), entry("a", "2"), entry("b", "3")];
    const out = buildCopyRows("distinct-collections", entries, new Set(), false);
    expect(out.rows.map((r) => [r.collectionSlug, r.objektId])).toEqual([
      ["b", null],
      ["a", null],
    ]);
    expect(out).toMatchObject({ carried: 2, leftOut: 0 });
  });

  test("tokens drops copies no longer owned and keeps order", () => {
    const entries = [entry("a", "1"), entry("b", "2"), entry("c", "3")];
    const out = buildCopyRows("tokens", entries, new Set(["3", "1"]), false);
    expect(out.rows.map((r) => r.objektId)).toEqual(["1", "3"]);
    expect(out).toMatchObject({ carried: 2, leftOut: 1 });
  });

  test("expand adds every owned copy sorted by serial and counts unowned collections", () => {
    const owned = new Map<string, OwnedCopy[]>([
      [
        "a",
        [
          { id: "9", serial: 40 },
          { id: "8", serial: 12 },
        ],
      ],
    ]);
    const entries = [entry("a"), entry("b"), entry("c"), entry("a")];
    const out = buildCopyRows("expand", entries, owned, false);
    expect(out.rows.map((r) => r.objektId)).toEqual(["8", "9"]);
    expect(out).toMatchObject({ carried: 1, leftOut: 2 });
  });

  test("prices go with rows and tokens when carried", () => {
    const priced = { price: 5, isQyop: true, note: "n" };
    const rows = buildCopyRows("rows", [entry("a", null, priced)], new Set(), true);
    expect(rows.rows[0]).toMatchObject(priced);
    const tokens = buildCopyRows("tokens", [entry("a", "1", priced)], new Set(["1"]), true);
    expect(tokens.rows[0]).toMatchObject(priced);
  });

  test("prices are dropped when not carried", () => {
    const priced = { price: 5, isQyop: true, note: "n" };
    const out = buildCopyRows("rows", [entry("a", null, priced)], new Set(), false);
    expect(out.rows[0]).toMatchObject({ price: null, isQyop: false, note: null });
  });

  test("expand and distinct-collections never carry prices", () => {
    const priced = { price: 5, isQyop: true, note: "n" };
    const owned = new Map([["a", [{ id: "1", serial: 1 }]]]);
    const expand = buildCopyRows("expand", [entry("a", "1", priced)], owned, true);
    expect(expand.rows[0]).toMatchObject({ price: null, isQyop: false, note: null });
    const distinct = buildCopyRows(
      "distinct-collections",
      [entry("a", "1", priced)],
      new Set(),
      true,
    );
    expect(distinct.rows[0]).toMatchObject({ price: null, isQyop: false, note: null });
  });

  test("an entry with no collection is left out in every mode", () => {
    const entries = [entry(null, "1"), entry("a", "2")];
    const owned = new Map([["a", [{ id: "2", serial: 1 }]]]);
    expect(buildCopyRows("rows", entries, new Set(), false)).toMatchObject({
      carried: 1,
      leftOut: 1,
    });
    expect(buildCopyRows("tokens", entries, new Set(["1", "2"]), false)).toMatchObject({
      carried: 1,
      leftOut: 1,
    });
    expect(buildCopyRows("distinct-collections", entries, new Set(), false)).toMatchObject({
      carried: 1,
      leftOut: 1,
    });
    expect(buildCopyRows("expand", entries, owned, false)).toMatchObject({
      carried: 1,
      leftOut: 1,
    });
  });
});
