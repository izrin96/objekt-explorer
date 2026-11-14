import { describe, expect, test } from "bun:test";

import { type PostId, type PostRow, type RowList, planPostRows } from "./trade-post-rows";

const row = (id: number, leadListId: number, wantListId: number | null = null): PostRow => ({
  id: id as PostId,
  leadListId,
  wantListId,
});
const list = (
  id: number,
  listType: RowList["listType"],
  discoverable: boolean,
  linkedListId: number | null = null,
): RowList => ({ id, listType, discoverable, linkedListId });

// the planner's ids are branded; the expectations here are plain numbers
type PlainOps = {
  deletes: number[];
  updates: { id: number; wantListId: number | null }[];
  inserts: { leadListId: number; wantListId: number | null }[];
};
const plan = (rows: PostRow[], lists: RowList[]): PlainOps => planPostRows(rows, lists);

const NONE = { deletes: [], updates: [], inserts: [] };
// have 1 and want 2 are a pair, on Trade
const pair = [list(1, "have", true, 2), list(2, "want", true, 1)];

describe("planPostRows", () => {
  test("a first post: a pair is one row, led by the have list", () => {
    expect(plan([], pair)).toEqual({
      ...NONE,
      inserts: [{ leadListId: 1, wantListId: 2 }],
    });
  });

  test("a have list and a want list on Trade with no link are two rows", () => {
    expect(plan([], [list(1, "have", true), list(2, "want", true)]).inserts).toEqual([
      { leadListId: 1, wantListId: null },
      { leadListId: 2, wantListId: null },
    ]);
  });

  test("a list off Trade with no link and no row gets none", () => {
    expect(plan([], [list(1, "sale", false), list(2, "want", false)])).toEqual(NONE);
  });

  test("Take off Trade keeps the row, and posting again finds it", () => {
    const off = [list(1, "have", false, 2), list(2, "want", false, 1)];
    expect(plan([row(10, 1, 2)], off)).toEqual(NONE);
    expect(plan([row(10, 1, 2)], pair)).toEqual(NONE);
  });

  test("an off-Trade list with no link keeps the row it has", () => {
    expect(plan([row(10, 1)], [list(1, "have", false)])).toEqual(NONE);
  });

  test("linking a Buy post to a have list moves the want list into the have list's row", () => {
    expect(plan([row(10, 1), row(11, 2)], pair)).toEqual({
      deletes: [11],
      updates: [{ id: 10, wantListId: 2 }],
      inserts: [],
    });
  });

  test("a lone want post linked to an off-Trade have list joins that list's new row", () => {
    const lists = [list(1, "have", false, 2), list(2, "want", true, 1)];
    expect(plan([row(11, 2)], lists)).toEqual({
      deletes: [11],
      updates: [],
      inserts: [{ leadListId: 1, wantListId: 2 }],
    });
  });

  test("unlinking leaves the have list its row and gives the want list its own", () => {
    const lists = [list(1, "have", true), list(2, "want", true)];
    expect(plan([row(10, 1, 2)], lists)).toEqual({
      deletes: [],
      updates: [{ id: 10, wantListId: null }],
      inserts: [{ leadListId: 2, wantListId: null }],
    });
  });

  test("an unlinked want list that is off Trade gets no row", () => {
    const lists = [list(1, "have", true), list(2, "want", false)];
    expect(plan([row(10, 1, 2)], lists).inserts).toEqual([]);
  });

  test("swapping the want list keeps the row and rehomes the old want list", () => {
    const lists = [list(1, "have", true, 3), list(2, "want", true), list(3, "want", true, 1)];
    expect(plan([row(10, 1, 2), row(12, 3)], lists)).toEqual({
      deletes: [12],
      updates: [{ id: 10, wantListId: 3 }],
      inserts: [{ leadListId: 2, wantListId: null }],
    });
  });

  test("the lead deleted: its row goes and the want list stands alone", () => {
    expect(plan([row(10, 1, 2)], [list(2, "want", true)])).toEqual({
      deletes: [10],
      updates: [],
      inserts: [{ leadListId: 2, wantListId: null }],
    });
  });

  test("the want list deleted: the row stays without it", () => {
    expect(plan([row(10, 1, 2)], [list(1, "have", true)])).toEqual({
      ...NONE,
      updates: [{ id: 10, wantListId: null }],
    });
  });

  test("a Buy post's want list deleted, and every list gone", () => {
    expect(plan([row(11, 2)], [])).toEqual({ ...NONE, deletes: [11] });
    expect(plan([row(10, 1, 2), row(11, 3)], []).deletes).toEqual([10, 11]);
  });

  test("a list created on Trade with no link gets a row", () => {
    expect(plan([row(10, 1, 2)], [...pair, list(3, "sale", true)]).inserts).toEqual([
      { leadListId: 3, wantListId: null },
    ]);
  });

  test("two rows led by one list collapse onto the lowest id", () => {
    expect(plan([row(12, 1), row(10, 1, 2)], pair)).toEqual({ ...NONE, deletes: [12] });
  });

  test("a link read from the want side alone is no pair", () => {
    const lists = [list(1, "have", true), list(2, "want", true, 1)];
    expect(plan([], lists).inserts).toHaveLength(2);
  });

  test("two lists naming one want list: the lower id keeps it", () => {
    const lists = [list(1, "have", true, 3), list(2, "sale", true, 3), list(3, "want", true, 1)];
    expect(plan([], lists).inserts).toEqual([
      { leadListId: 1, wantListId: 3 },
      { leadListId: 2, wantListId: null },
    ]);
  });
});
