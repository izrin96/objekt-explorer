import { describe, expect, test } from "bun:test";

import { pairPosts, type TradeList } from "./trade-feed";
import {
  type PostId,
  type PostRow,
  type PostWrite,
  type RowList,
  type TradeListState,
  applyPairing,
  partnersOf,
  planPostRows,
  planPostWrite,
  postRowOf,
} from "./trade-post-rows";

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
  updates: { id: number; leadListId?: number; wantListId: number | null }[];
  inserts: { leadListId: number; wantListId: number | null }[];
};
const plan = (rows: PostRow[], lists: RowList[], live?: number[]): PlainOps =>
  planPostRows(rows, lists, live && new Set(live));

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

  test("a merge keeps the row of the post that was on Trade", () => {
    const rows = [row(10, 1), row(11, 2)];
    // the Buy post was live and the have list's row was left from before: the Buy post's stays
    expect(plan(rows, pair, [2])).toEqual({
      deletes: [10],
      updates: [{ id: 11, leadListId: 1, wantListId: 2 }],
      inserts: [],
    });
    // both live, the have list alone, or neither: the lead's stays
    for (const live of [[1, 2], [1], []]) {
      expect(plan(rows, pair, live)).toEqual({
        deletes: [11],
        updates: [{ id: 10, wantListId: 2 }],
        inserts: [],
      });
    }
  });

  test("a merge onto the live Buy post hands the lead's old want list the lead's old row", () => {
    // 1 led 3 off Trade; the live Buy post 2 takes 1, and 3, on Trade now, takes over row 10
    const lists = [list(1, "have", true, 2), list(2, "want", true, 1), list(3, "want", true)];
    expect(plan([row(10, 1, 3), row(11, 2)], lists, [2])).toEqual({
      deletes: [],
      updates: [
        { id: 11, leadListId: 1, wantListId: 2 },
        { id: 10, leadListId: 3, wantListId: null },
      ],
      inserts: [],
    });
  });

  test("a Buy post linked to a have list with no row keeps its row, led by the have list", () => {
    const lists = [list(1, "have", false, 2), list(2, "want", true, 1)];
    expect(plan([row(11, 2)], lists)).toEqual({
      ...NONE,
      updates: [{ id: 11, leadListId: 1, wantListId: 2 }],
    });
  });

  test("a new sale list paired with a Buy post takes over its row too", () => {
    const lists = [list(2, "want", true, 5), list(5, "sale", true, 2)];
    expect(plan([row(11, 2)], lists)).toEqual({
      ...NONE,
      updates: [{ id: 11, leadListId: 5, wantListId: 2 }],
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

  test("the lead gone, the want list on Trade: the row stays, led by the want list", () => {
    expect(plan([row(10, 1, 2)], [list(2, "want", true)])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 2, wantListId: null }],
    });
  });

  test("the lead gone, the want list off Trade: the row goes", () => {
    expect(plan([row(10, 1, 2)], [list(2, "want", false)])).toEqual({ ...NONE, deletes: [10] });
  });

  test("each doomed row is taken over once, lowest id first", () => {
    // 1 and 3 are gone; their want lists 2 and 4 are on Trade
    const lists = [list(2, "want", true), list(4, "want", true)];
    expect(plan([row(12, 3, 4), row(10, 1, 2)], lists)).toEqual({
      ...NONE,
      updates: [
        { id: 10, leadListId: 2, wantListId: null },
        { id: 12, leadListId: 4, wantListId: null },
      ],
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

const pairs = (partners: Map<number, number>) => [...partners].toSorted(([a], [b]) => a - b);

describe("partnersOf", () => {
  test("a pair names both ways; a Buy post and a lone lead have no partner", () => {
    expect(pairs(partnersOf([row(10, 1, 2), row(11, 3), row(12, 4)]))).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });

  test("a list in two rows: the lowest row wins and the later lead gets no partner", () => {
    expect(pairs(partnersOf([row(11, 3, 2), row(10, 1, 2)]))).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });

  test("a lead in two rows keeps what its lowest row says", () => {
    expect(pairs(partnersOf([row(10, 1), row(11, 1, 2)]))).toEqual([]);
  });
});

describe("applyPairing", () => {
  // 1 with 2, and 3 with 4
  const two = partnersOf([row(10, 1, 2), row(11, 3, 4)]);

  test("pairing two lists that each have a partner leaves both old partners with none", () => {
    expect(pairs(applyPairing(two, { pair: [1, 4] }))).toEqual([
      [1, 4],
      [4, 1],
    ]);
  });

  test("pairing the same pair again changes nothing, in either order", () => {
    expect(pairs(applyPairing(two, { pair: [1, 2] }))).toEqual(pairs(two));
    expect(pairs(applyPairing(two, { pair: [2, 1] }))).toEqual(pairs(two));
  });

  test("unpairing a list takes its partner's too; a list with no partner is no change", () => {
    expect(pairs(applyPairing(two, { unpair: [2] }))).toEqual([
      [3, 4],
      [4, 3],
    ]);
    expect(pairs(applyPairing(two, { unpair: [9] }))).toEqual(pairs(two));
  });

  test("the unpairs run before the pair", () => {
    expect(pairs(applyPairing(two, { unpair: [1, 2], pair: [1, 2] }))).toEqual(pairs(two));
  });

  test("a new list paired with a paired list takes it from its partner", () => {
    expect(pairs(applyPairing(two, { pair: [5, 2] }))).toEqual([
      [2, 5],
      [3, 4],
      [4, 3],
      [5, 2],
    ]);
  });
});

describe("planPostWrite", () => {
  const state = (
    id: number,
    listType: TradeListState["listType"],
    discoverable = true,
  ): TradeListState => ({ id, listType, discoverable });
  const lists = [state(1, "have"), state(2, "want"), state(3, "have"), state(4, "want")];
  const rows = [row(10, 1, 2), row(11, 3, 4)];
  const write = (change: PostWrite, before = { lists, rows }) => {
    const { ops, relinked } = planPostWrite(before, change);
    return { ops: ops as PlainOps, relinked };
  };

  test("no change: nothing to write", () => {
    expect(write({})).toEqual({ ops: NONE, relinked: [] });
    expect(write({ pair: null, unpair: [] })).toEqual({ ops: NONE, relinked: [] });
  });

  test("pairing across two pairs rehomes both old partners", () => {
    expect(write({ pair: [1, 4] })).toEqual({
      ops: {
        deletes: [],
        // 3 keeps its row without a want list, and 2 stands alone on Trade
        updates: [
          { id: 10, wantListId: 4 },
          { id: 11, wantListId: null },
        ],
        inserts: [{ leadListId: 2, wantListId: null }],
      },
      relinked: [1, 2, 3, 4],
    });
  });

  test("the same pair again writes no row", () => {
    expect(write({ pair: [1, 2] })).toEqual({ ops: NONE, relinked: [] });
  });

  test("an unpair gives the want list on Trade its own row", () => {
    expect(write({ unpair: [1, 2] })).toEqual({
      ops: {
        deletes: [],
        updates: [{ id: 10, wantListId: null }],
        inserts: [{ leadListId: 2, wantListId: null }],
      },
      relinked: [1, 2],
    });
  });

  test("a new list created paired with a paired want list", () => {
    expect(write({ pair: [5, 2], written: [state(5, "have", false)] })).toEqual({
      ops: {
        deletes: [],
        updates: [{ id: 10, wantListId: null }],
        inserts: [{ leadListId: 5, wantListId: 2 }],
      },
      relinked: [1, 2, 5],
    });
  });

  test("a live Buy post paired with a have list that was off Trade keeps its row", () => {
    const before = {
      lists: [state(1, "have", false), state(2, "want")],
      rows: [row(10, 1), row(11, 2)],
    };
    expect(write({ pair: [1, 2], written: [state(1, "have")] }, before)).toEqual({
      ops: { deletes: [10], updates: [{ id: 11, leadListId: 1, wantListId: 2 }], inserts: [] },
      relinked: [1, 2],
    });
  });

  test("a removed lead: its partner on Trade takes over the row", () => {
    expect(write({ removed: [1] })).toEqual({
      ops: { ...NONE, updates: [{ id: 10, leadListId: 2, wantListId: null }] },
      relinked: [2],
    });
  });

  test("a removed lead whose partner is off Trade: the row goes", () => {
    const before = { lists: [state(1, "have"), state(2, "want", false)], rows: [row(10, 1, 2)] };
    expect(write({ removed: [1] }, before)).toEqual({
      ops: { ...NONE, deletes: [10] },
      relinked: [2],
    });
  });

  test("a removed lead with no partner: the row goes", () => {
    const before = { lists: [state(1, "have")], rows: [row(10, 1)] };
    expect(write({ removed: [1] }, before)).toEqual({
      ops: { ...NONE, deletes: [10] },
      relinked: [],
    });
  });

  test("a removed want list: the row stays, emptied", () => {
    expect(write({ removed: [2] })).toEqual({
      ops: { ...NONE, updates: [{ id: 10, wantListId: null }] },
      relinked: [1],
    });
  });

  test("a list in two rows: the planner empties the later row", () => {
    const before = { lists: lists.slice(0, 3), rows: [row(10, 1, 2), row(11, 3, 2)] };
    expect(write({}, before)).toEqual({
      ops: { ...NONE, updates: [{ id: 11, wantListId: null }] },
      relinked: [],
    });
  });

  test("a written list overrides what was read, and a new one joins", () => {
    // 1 leaves Trade and keeps its row; 5 is created on Trade
    expect(write({ written: [state(1, "have", false), state(5, "want")] })).toEqual({
      ops: { ...NONE, inserts: [{ leadListId: 5, wantListId: null }] },
      relinked: [],
    });
  });
});

describe("postRowOf", () => {
  const rows = [
    row(1000001, 1, 2),
    row(1000002, 3),
    row(1000003, 4, 5),
    row(1000004, 6),
    row(1000005, 6),
  ];

  test("a lead and its want list share the row", () => {
    expect(postRowOf(rows, 1)).toBe(1000001 as PostId);
    expect(postRowOf(rows, 2)).toBe(1000001 as PostId);
  });

  test("a lead alone has its row", () => {
    expect(postRowOf(rows, 3)).toBe(1000002 as PostId);
  });

  test("a want list in a row led by another list has that row", () => {
    expect(postRowOf(rows, 5)).toBe(1000003 as PostId);
  });

  test("a list leading two rows has the lowest", () => {
    expect(postRowOf(rows, 6)).toBe(1000004 as PostId);
  });

  test("a list in no row has none", () => {
    expect(postRowOf(rows, 7)).toBeNull();
  });
});

describe("posts shown on Trade", () => {
  const onTrade = (
    id: number,
    listType: TradeList["listType"],
    linkedListId: number | null,
    takesSwaps = false,
  ): TradeList => ({
    id,
    userId: "u",
    listType,
    linkedListId,
    takesSwaps,
    matchHave: true,
    matchSale: false,
    bumpedAt: null,
    updatedAt: "2026-01-01T00:00:00Z",
  });

  test("no two share a row", () => {
    const rows = [
      row(1000001, 1, 2),
      row(1000002, 3),
      row(1000003, 4, 5),
      row(1000004, 6, 7),
      row(1000005, 8),
    ];
    // list 4 is off Trade, so want 5 is shown alone
    const shown = [
      onTrade(1, "have", 2),
      onTrade(2, "want", 1),
      onTrade(3, "want", null),
      onTrade(5, "want", 4),
      onTrade(6, "sale", 7, true),
      onTrade(7, "want", 6),
      onTrade(8, "sale", null),
    ];
    const ids = pairPosts(shown).map((post) => postRowOf(rows, post.anchor.id));
    expect(ids.toSorted((a, b) => (a ?? 0) - (b ?? 0))).toEqual([
      1000001, 1000002, 1000003, 1000004, 1000005,
    ] as PostId[]);
  });
});
