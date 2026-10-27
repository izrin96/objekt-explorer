import { describe, expect, test } from "bun:test";

import { type Kept, nextKept, withKept } from "./kept-row";

type Row = { id: number; deal: string };
const a: Row = { id: 1, deal: "your turn" };
const b: Row = { id: 2, deal: "offer" };
const c: Row = { id: 3, deal: "decide" };

describe("nextKept", () => {
  test("follows the open row while the list holds it", () => {
    expect(nextKept(null, [a, b, c], 2, true, "needs-you:")).toEqual({
      filter: "needs-you:",
      row: b,
      index: 1,
    });
  });

  test("keeps it once a refetch drops it", () => {
    const kept: Kept<Row> = { filter: "needs-you:", row: b, index: 1 };
    expect(nextKept(kept, [a, c], 2, true, "needs-you:")).toBe(kept);
  });

  test("lets it go when the filter is applied again", () => {
    const kept: Kept<Row> = { filter: "needs-you::0", row: b, index: 1 };
    expect(nextKept(kept, [a, c], 2, true, "needs-you::1")).toBeNull();
  });

  test("lets it go under All and when another conversation opens", () => {
    const kept: Kept<Row> = { filter: "f", row: b, index: 1 };
    expect(nextKept(kept, [a, c], 2, false, "f")).toBeNull();
    expect(nextKept(kept, [a, c], 3, true, "f")).toEqual({ filter: "f", row: c, index: 1 });
    expect(nextKept(kept, [a], 3, true, "f")).toBeNull();
    expect(nextKept(kept, [a, c], null, true, "f")).toBeNull();
  });

  test("never adopts the open row from the previous filter's results", () => {
    const kept: Kept<Row> = { filter: "needs-you::0", row: b, index: 1 };
    // a search was typed: the old list is still on screen under the new filter
    expect(nextKept(kept, [a, b], 2, true, "needs-you:dal:0", false)).toBeNull();
    // the new results arrive without it
    expect(nextKept(null, [a], 2, true, "needs-you:dal:0")).toBeNull();
  });

  test("returns the same object when nothing changed, so a render settles", () => {
    const kept = nextKept(null, [a, b], 2, true, "f");
    expect(nextKept(kept, [a, b], 2, true, "f")).toBe(kept);
  });
});

describe("withKept", () => {
  test("puts the dropped row back at its place, with its live state", () => {
    const kept: Kept<Row> = { filter: "f", row: b, index: 1 };
    const live = { id: 2, deal: "their turn" };
    expect(withKept([a, c], kept, live)).toEqual([a, live, c]);
  });

  test("past the end when the list shrank", () => {
    expect(withKept([], { filter: "f", row: b, index: 4 })).toEqual([b]);
  });

  test("leaves a list that holds it alone", () => {
    const rows = [a, b];
    expect(withKept(rows, { filter: "f", row: b, index: 1 })).toBe(rows);
    expect(withKept(rows, null)).toBe(rows);
  });
});
