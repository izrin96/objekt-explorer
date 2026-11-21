import { describe, expect, test } from "bun:test";

import {
  type PostId,
  type PostRow,
  type PostState,
  type RowList,
  type TradeListState,
  applyPairing,
  componentOf,
  partnersOf,
  type PostChange,
  planPostChange,
  planPostRows,
  postRowOf,
  rowStateOf,
  type SideIntent,
  type StateContext,
} from "./trade-post-rows";
import { pairPosts, type TradeList } from "./trade-posts";

// the state the row columns default to; tests of the pairing alone never read it
const DEFAULT_STATE: PostState = {
  leadOnTrade: false,
  leadBumpedAt: null,
  wantOnTrade: false,
  wantBumpedAt: null,
  matchHave: true,
  matchSale: true,
  takesSwaps: false,
};
const row = (
  id: number,
  leadListId: number,
  wantListId: number | null = null,
  state: PostState = DEFAULT_STATE,
): PostRow => ({ id: id as PostId, leadListId, wantListId, state });
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
  moves: { from: number; to: number }[];
};
const plan = (rows: PostRow[], lists: RowList[], live?: number[]): PlainOps =>
  planPostRows(rows, lists, live && new Set(live));

const NONE = { deletes: [], updates: [], inserts: [], moves: [] };
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
      moves: [{ from: 11, to: 10 }],
    });
  });

  test("a merge keeps the row of the post that was on Trade", () => {
    const rows = [row(10, 1), row(11, 2)];
    // the Buy post was live and the have list's row was left from before: the Buy post's stays
    expect(plan(rows, pair, [2])).toEqual({
      deletes: [10],
      updates: [{ id: 11, leadListId: 1, wantListId: 2 }],
      inserts: [],
      moves: [{ from: 10, to: 11 }],
    });
    // both live, the have list alone, or neither: the lead's stays
    for (const live of [[1, 2], [1], []]) {
      expect(plan(rows, pair, live)).toEqual({
        deletes: [11],
        updates: [{ id: 10, wantListId: 2 }],
        inserts: [],
        moves: [{ from: 11, to: 10 }],
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
      // 1 now leads row 11, so a hide on its old row follows it there
      moves: [{ from: 10, to: 11 }],
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
      moves: [],
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
      moves: [{ from: 12, to: 10 }],
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

  test("D1: two rows led by one list collapse onto the lowest id, and the hide moves there", () => {
    expect(plan([row(12, 1), row(10, 1, 2)], pair)).toEqual({
      ...NONE,
      deletes: [12],
      moves: [{ from: 12, to: 10 }],
    });
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

/**
 * A list with the bump and Open to its side holds: the planner reads neither from a list, equation
 * E does, to build rows in step with it.
 */
type SideList = TradeListState & {
  bumpedAt: string | null;
  matchHave: boolean;
  matchSale: boolean;
  takesSwaps: boolean;
};

const state = (
  id: number,
  listType: TradeListState["listType"],
  discoverable = true,
  more: Partial<SideList> = {},
): SideList => ({
  id,
  listType,
  discoverable,
  bumpedAt: discoverable ? `t${id}` : null,
  matchHave: true,
  matchSale: true,
  takesSwaps: false,
  ...more,
});

describe("planPostRows moves a hide with its lead", () => {
  test("D3, the default merge: the Buy post's row goes, its hide moves to the have list's row", () => {
    // have 1 (row 10) takes Buy post 2 (row 11)
    expect(plan([row(10, 1), row(11, 2)], pair)).toEqual({
      deletes: [11],
      updates: [{ id: 10, wantListId: 2 }],
      inserts: [],
      moves: [{ from: 11, to: 10 }],
    });
  });

  test("D2, the live merge: the have list's row goes, its hide moves to the re-led Buy post's row", () => {
    expect(plan([row(10, 1), row(11, 2)], pair, [2])).toEqual({
      deletes: [10],
      updates: [{ id: 11, leadListId: 1, wantListId: 2 }],
      inserts: [],
      moves: [{ from: 10, to: 11 }],
    });
  });

  test("relead: a new have list joins a Buy post, whose hide stays", () => {
    expect(plan([row(11, 2)], pair).moves).toEqual([]);
  });

  test("unpair: the hide stays on the lead's row, the want list's new row is not hidden", () => {
    const unpaired = [list(1, "have", true), list(2, "want", true)];
    expect(plan([row(10, 1, 2)], unpaired)).toEqual({
      ...NONE,
      updates: [{ id: 10, wantListId: null }],
      inserts: [{ leadListId: 2, wantListId: null }],
    });
  });

  test("Edit post swapping the have list: the old have list keeps its row and the hide", () => {
    const swapped = [list(1, "have", true), list(2, "want", true, 3), list(3, "have", true, 2)];
    expect(plan([row(10, 1, 2)], swapped)).toEqual({
      ...NONE,
      updates: [{ id: 10, wantListId: null }],
      inserts: [{ leadListId: 3, wantListId: 2 }],
    });
  });
});

/** Equation E: each side from its list, Open to from the open list, `takes_swaps` from a sale lead. */
function equation(lead: SideList, want: SideList | null): PostState {
  const open = want ?? (lead.listType === "want" ? lead : null);
  return {
    leadOnTrade: lead.discoverable,
    leadBumpedAt: lead.bumpedAt,
    wantOnTrade: want?.discoverable ?? false,
    wantBumpedAt: want?.bumpedAt ?? null,
    matchHave: open?.matchHave ?? true,
    matchSale: open?.matchSale ?? true,
    takesSwaps: lead.listType === "sale" && lead.takesSwaps,
  };
}

/** A row stored in step with its lists, as every write leaves one while a list is in one row. */
function stored(lists: SideList[], id: number, lead: number, want: number | null = null) {
  const byId = new Map(lists.map((entry) => [entry.id, entry]));
  return row(id, lead, want, equation(byId.get(lead)!, want === null ? null : byId.get(want)!));
}

const NOW = "now";

describe("planPostChange", () => {
  const lists = [state(1, "have"), state(2, "want"), state(3, "have"), state(4, "want")];
  const rows = [stored(lists, 10, 1, 2), stored(lists, 11, 3, 4)];
  // the pairing alone; `planPostChange states` checks the state
  const write = (change: PostChange, before = { lists, rows }) => {
    const { ops, relinked } = planPostChange({ ...before, bumpAt: NOW }, change);
    const { states: _, lists: __, ...rest } = ops;
    return {
      ops: {
        ...rest,
        inserts: rest.inserts.map(({ leadListId, wantListId }) => ({ leadListId, wantListId })),
      } as PlainOps,
      relinked: relinked.toSorted((a, b) => a - b),
    };
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
        moves: [],
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
        moves: [],
      },
      relinked: [1, 2],
    });
  });

  test("a new list created paired with a paired want list", () => {
    expect(write({ pair: [5, 2], created: state(5, "have", false) })).toEqual({
      ops: {
        deletes: [],
        updates: [{ id: 10, wantListId: null }],
        inserts: [{ leadListId: 5, wantListId: 2 }],
        moves: [],
      },
      relinked: [1, 2, 5],
    });
  });

  test("a live Buy post paired with a have list that was off Trade keeps its row", () => {
    const lists = [state(1, "have", false), state(2, "want")];
    const before = { lists, rows: [stored(lists, 10, 1), stored(lists, 11, 2)] };
    expect(write({ pair: [1, 2], sides: [{ listId: 1, on: true }] }, before)).toEqual({
      ops: {
        deletes: [10],
        updates: [{ id: 11, leadListId: 1, wantListId: 2 }],
        inserts: [],
        moves: [{ from: 10, to: 11 }],
      },
      relinked: [1, 2],
    });
  });

  test("a deleted lead whose want list is on Trade: the re-led row keeps its hide", () => {
    expect(write({ removed: [1] }).ops.moves).toEqual([]);
  });

  test("a deleted lead whose want list is off Trade: the row ends, and its hide with it", () => {
    const lists = [state(1, "have"), state(2, "want", false)];
    const before = { lists, rows: [stored(lists, 10, 1, 2)] };
    expect(write({ removed: [1] }, before).ops).toEqual({ ...NONE, deletes: [10] });
  });

  test("takeover: the have list's row is handed to its old want list, the hide follows the have list", () => {
    // have 1 off Trade with its want list 2 (row 10) pairs with live Buy post 3 (row 11)
    const lists = [state(1, "have", false), state(2, "want"), state(3, "want")];
    const before = { lists, rows: [stored(lists, 10, 1, 2), stored(lists, 11, 3)] };
    expect(write({ pair: [1, 3] }, before).ops).toEqual({
      deletes: [],
      updates: [
        { id: 11, leadListId: 1, wantListId: 3 },
        { id: 10, leadListId: 2, wantListId: null },
      ],
      inserts: [],
      moves: [{ from: 10, to: 11 }],
    });
  });

  test("a removed lead: its partner on Trade takes over the row", () => {
    expect(write({ removed: [1] })).toEqual({
      ops: { ...NONE, updates: [{ id: 10, leadListId: 2, wantListId: null }] },
      relinked: [2],
    });
  });

  test("a removed lead whose partner is off Trade: the row goes", () => {
    const lists = [state(1, "have"), state(2, "want", false)];
    const before = { lists, rows: [stored(lists, 10, 1, 2)] };
    expect(write({ removed: [1] }, before)).toEqual({
      ops: { ...NONE, deletes: [10] },
      relinked: [2],
    });
  });

  test("a removed lead with no partner: the row goes", () => {
    const lists = [state(1, "have")];
    expect(write({ removed: [1] }, { lists, rows: [stored(lists, 10, 1)] })).toEqual({
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

  test("an intent overrides the rows' Trade state, and a created list joins", () => {
    // 1 leaves Trade and keeps its row; 5 is created on Trade
    expect(
      write({
        created: state(5, "want"),
        sides: [
          { listId: 1, on: false },
          { listId: 5, on: true },
        ],
      }),
    ).toEqual({
      ops: { ...NONE, inserts: [{ leadListId: 5, wantListId: null }] },
      relinked: [],
    });
  });

  test("a write leaves a row it does not name as it is, stale or not", () => {
    // row 11 holds no state of its lists; nothing names it
    const before = { lists, rows: [stored(lists, 10, 1, 2), row(11, 3, 4)] };
    const { ops } = planPostChange(
      { ...before, bumpAt: NOW },
      { sides: [{ listId: 1, on: true }] },
    );
    expect(ops.states).toEqual([]);
    expect(ops.lists).toEqual([]);
  });
});

describe("planPostChange states", () => {
  const plan = (lists: TradeListState[], rows: PostRow[], change: PostChange) => {
    const { ops } = planPostChange({ lists, rows, bumpAt: NOW }, change);
    return { inserts: ops.inserts, states: ops.states as { id: number; state: PostState }[] };
  };
  const have = state(1, "have", true, { bumpedAt: "h" });
  const want = state(2, "want", true, { bumpedAt: "w", matchSale: false });

  test("no change: no state to write", () => {
    const lists = [have, want];
    expect(plan(lists, [stored(lists, 10, 1, 2)], {})).toEqual({ inserts: [], states: [] });
  });

  test("a list put on Trade with no row: the insert carries its state, bumped now", () => {
    const off = state(1, "have", false);
    expect(plan([off], [], { sides: [{ listId: 1, on: true }] }).inserts).toEqual([
      {
        leadListId: 1,
        wantListId: null,
        state: equation({ ...off, discoverable: true, bumpedAt: NOW }, null),
      },
    ]);
  });

  test("a pair made: the want list's row holds both lists' state", () => {
    const lists = [want];
    const created = state(5, "have", true, { bumpedAt: NOW });
    const { inserts, states } = plan(lists, [stored(lists, 11, 2)], {
      pair: [5, 2],
      created,
      sides: [{ listId: 5, on: true }],
    });
    expect(inserts).toEqual([]);
    // the want list's row takes the new have list as its lead and keeps its id
    expect(states).toEqual([{ id: 11, state: equation(created, want) }]);
  });

  test("a split: the lead's row loses the want side, the freed want list gets a row", () => {
    const lists = [have, want];
    const { inserts, states } = plan(lists, [stored(lists, 10, 1, 2)], { unpair: [1, 2] });
    expect(states).toEqual([{ id: 10, state: equation(have, null) }]);
    expect(inserts).toEqual([{ leadListId: 2, wantListId: null, state: equation(want, null) }]);
  });

  test("a deleted lead: its want list on Trade takes over the row with its own state", () => {
    const lists = [have, want];
    expect(plan(lists, [stored(lists, 10, 1, 2)], { removed: [1] }).states).toEqual([
      { id: 10, state: equation(want, null) },
    ]);
  });

  test("a merge keeping the want list's row: the have list's state as lead", () => {
    const off = state(1, "have", false);
    const lists = [off, want];
    const { inserts, states } = plan(lists, [stored(lists, 10, 1), stored(lists, 11, 2)], {
      pair: [1, 2],
      sides: [{ listId: 1, on: true }],
    });
    expect(inserts).toEqual([]);
    expect(states).toEqual([
      { id: 11, state: equation({ ...off, discoverable: true, bumpedAt: NOW }, want) },
    ]);
  });

  test("a merge keeping the lead's row: the joining want list's state", () => {
    const lists = [have, want];
    const { states } = plan(lists, [stored(lists, 10, 1), stored(lists, 11, 2)], {
      pair: [1, 2],
    });
    expect(states).toEqual([{ id: 10, state: equation(have, want) }]);
  });

  test("a want list swapped: the new want list's state, the defaults with no row of its own", () => {
    const other = state(3, "want", false, { matchHave: false });
    const lists = [have, want, other];
    const { states } = plan(lists, [stored(lists, 10, 1, 2)], { pair: [1, 3] });
    expect(states).toEqual([
      { id: 10, state: equation(have, { ...other, matchHave: true, matchSale: true }) },
    ]);
  });

  test("a deleted row has no state to write", () => {
    const lists = [state(1, "have")];
    expect(plan(lists, [stored(lists, 10, 1)], { removed: [1] })).toEqual({
      inserts: [],
      states: [],
    });
  });

  test("Take off Trade: both sides off, bumps and Open to unchanged", () => {
    const lists = [have, want];
    const { states } = plan(lists, [stored(lists, 10, 1, 2)], {
      post: { row: 10 as PostId },
      sides: [
        { listId: 1, on: false },
        { listId: 2, on: false },
      ],
    });
    expect(states).toEqual([
      {
        id: 10,
        state: {
          leadOnTrade: false,
          leadBumpedAt: "h",
          wantOnTrade: false,
          wantBumpedAt: "w",
          matchHave: true,
          matchSale: false,
          takesSwaps: false,
        },
      },
    ]);
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

describe("componentOf", () => {
  const components = (...args: Parameters<typeof componentOf>): number[][] =>
    componentOf(...args).map((ids) => ids.map(Number));
  // have 1 + want 2 in 10; have 3 + want 4 in 11; want 5 alone in 12; have 6 parked in 13
  const rows = [row(10, 1, 2), row(11, 3, 4), row(12, 5), row(13, 6)];

  test("savePost: the rows of the picked, dropped and paired lists, and the edited row", () => {
    expect(
      components(rows, {
        post: { row: 10 as PostId, lead: 1 },
        pair: [1, 5],
        unpair: [1, 2],
        sides: [
          { listId: 1, on: true },
          { listId: 5, on: true },
        ],
      }),
    ).toEqual([[10, 12]]);
  });

  test("takeDownPost: the post's row", () => {
    expect(
      components(rows, {
        post: { row: 11 as PostId },
        sides: [
          { listId: 3, on: false },
          { listId: 4, on: false },
        ],
      }),
    ).toEqual([[11]]);
  });

  test("writeList: the pair target's row; the created list is in none", () => {
    expect(components(rows, { pair: [99, 4], sides: [{ listId: 99, on: true }] })).toEqual([[11]]);
    expect(components(rows, { sides: [{ listId: 99, on: true }] })).toEqual([[]]);
  });

  test("deleteList: the deleted list's row; a list in no row, none", () => {
    expect(components(rows, { removed: [3] })).toEqual([[11]]);
    expect(components(rows, { removed: [7] })).toEqual([]);
  });

  test("a write naming nothing has no component", () => {
    expect(components(rows, {})).toEqual([]);
  });

  test("a newPost names no row, only its lists", () => {
    expect(
      components(rows, {
        newPost: true,
        pair: [1, 5],
        sides: [
          { listId: 1, on: true },
          { listId: 5, on: true },
        ],
      }),
    ).toEqual([[]]);
  });

  test("a list in post.row and in another row: only post.row", () => {
    // have 1 also leads 20, with want 8
    const shared = [...rows, row(20, 1, 8)];
    expect(
      components(shared, {
        post: { row: 20 as PostId, lead: 8 },
        unpair: [1, 8],
        sides: [
          { listId: 1, on: false },
          { listId: 8, on: true },
        ],
      }),
    ).toEqual([[20]]);
  });

  test("a removed list in two rows: two components, one per row", () => {
    const shared = [...rows, row(20, 1, 8)];
    expect(components(shared, { removed: [1] })).toEqual([[10], [20]]);
  });

  test("a list in two rows of one write throws", () => {
    // want 2 sits in 10 and in 21
    const drifted = [...rows, row(21, 7, 2)];
    expect(() =>
      components(drifted, {
        sides: [
          { listId: 1, on: false },
          { listId: 7, on: false },
        ],
      }),
    ).toThrow("a list in two rows of one write");
  });
});

describe("planPostRows keeps an edited post's row (decision 3)", () => {
  const edit = (
    rows: PostRow[],
    lists: RowList[],
    post: { row: number; lead?: number },
    live?: number[],
  ) =>
    planPostRows(rows, lists, live && new Set(live), {
      row: post.row as PostId,
      lead: post.lead,
    }) as PlainOps;

  test("Swap H for H2 in (H, W): R holds (H2, W), H gets a parked row", () => {
    const lists = [list(1, "have", false), list(2, "want", true, 3), list(3, "have", true, 2)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 3 }, [1, 2])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 3, wantListId: 2 }],
      inserts: [{ leadListId: 1, wantListId: null }],
    });
  });

  test("drop H, a Buy post of W: R holds (W), H gets a parked row", () => {
    const lists = [list(1, "have", false), list(2, "want", true)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 2 }, [1, 2])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 2, wantListId: null }],
      inserts: [{ leadListId: 1, wantListId: null }],
    });
  });

  test("Sell (S, W) into Swap (H, W): R holds (H, W), S gets a parked row", () => {
    const lists = [list(1, "sale", false), list(2, "want", true, 3), list(3, "have", true, 2)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 3 }, [1, 2])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 3, wantListId: 2 }],
      inserts: [{ leadListId: 1, wantListId: null }],
    });
  });

  test("a Swap with W on and H off, into Swap (H2, W): R holds (H2, W), no live merge", () => {
    const lists = [list(1, "have", false), list(2, "want", true, 3), list(3, "have", true, 2)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 3 }, [2])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 3, wantListId: 2 }],
      inserts: [{ leadListId: 1, wantListId: null }],
    });
  });

  test("a Swap of H alone with W parked off, into a Swap of H2 alone: R holds (H2), (H, W) is new", () => {
    const lists = [list(1, "have", false, 2), list(2, "want", false, 1), list(3, "have", true)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 3 }, [1])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 3, wantListId: null }],
      inserts: [{ leadListId: 1, wantListId: 2 }],
    });
  });

  test("a Buy post W into Swap (H, W): unchanged, R re-led by relead", () => {
    const lists = [list(1, "have", true, 2), list(2, "want", true, 1)];
    expect(edit([row(10, 2)], lists, { row: 10, lead: 1 }, [2])).toEqual({
      ...NONE,
      updates: [{ id: 10, leadListId: 1, wantListId: 2 }],
    });
  });

  test("Swap W for W2 in (H, W): unchanged, R keeps H and takes W2", () => {
    const lists = [list(1, "have", true, 3), list(2, "want", false), list(3, "want", true, 1)];
    expect(edit([row(10, 1, 2)], lists, { row: 10, lead: 1 }, [1, 2])).toEqual({
      ...NONE,
      updates: [{ id: 10, wantListId: 3 }],
    });
  });

  test("H2 led a parked row P: R holds (H2, W), P goes and its hide moves to R", () => {
    const lists = [list(1, "have", false), list(2, "want", true, 3), list(3, "have", true, 2)];
    expect(edit([row(10, 1, 2), row(11, 3)], lists, { row: 10, lead: 3 }, [1, 2])).toEqual({
      deletes: [11],
      updates: [{ id: 10, leadListId: 3, wantListId: 2 }],
      inserts: [{ leadListId: 1, wantListId: null }],
      moves: [{ from: 11, to: 10 }],
    });
  });

  test("Take off Trade names the row and no lead: the row stays as it is", () => {
    const lists = [list(1, "have", false, 2), list(2, "want", false, 1)];
    expect(edit([row(10, 1, 2)], lists, { row: 10 }, [1, 2])).toEqual(NONE);
  });
});

describe("rowStateOf", () => {
  const stored = (
    id: number,
    listType: TradeListState["listType"],
    patch: Partial<TradeListState> = {},
  ): TradeListState => ({ id, listType, discoverable: false, ...patch });
  const ctx = (
    lists: TradeListState[],
    before: PostRow[],
    intents: SideIntent[] = [],
  ): StateContext => ({
    lists: new Map(lists.map((entry) => [entry.id, entry])),
    before,
    intents: new Map(intents.map((intent) => [intent.listId, intent])),
    bumpAt: "now",
  });
  const sideState = (patch: Partial<PostState>): PostState => ({ ...DEFAULT_STATE, ...patch });

  test("an intent turning a side on from off takes bumpAt", () => {
    const before = [row(10, 1, null, sideState({ leadBumpedAt: "side" }))];
    expect(
      rowStateOf(
        { leadListId: 1, wantListId: null },
        ctx([stored(1, "have")], before, [{ listId: 1, on: true }]),
      ),
    ).toEqual(sideState({ leadOnTrade: true, leadBumpedAt: "now" }));
  });

  test("a want side turned on with no Open to, over an old row: the row's Open to", () => {
    const before = [
      row(10, 1, 2, sideState({ matchHave: false, matchSale: true, wantBumpedAt: "side" })),
    ];
    const lists = [stored(1, "have", { discoverable: true }), stored(2, "want")];
    expect(
      rowStateOf({ leadListId: 1, wantListId: 2 }, ctx(lists, before, [{ listId: 2, on: true }])),
    ).toEqual(
      sideState({ wantOnTrade: true, wantBumpedAt: "now", matchHave: false, matchSale: true }),
    );
  });

  test("a turn-on with no Open to and no row: the defaults", () => {
    const lists = [stored(3, "want"), stored(4, "sale")];
    expect(
      rowStateOf({ leadListId: 3, wantListId: null }, ctx(lists, [], [{ listId: 3, on: true }])),
    ).toEqual(sideState({ leadOnTrade: true, leadBumpedAt: "now" }));
    expect(
      rowStateOf({ leadListId: 4, wantListId: null }, ctx(lists, [], [{ listId: 4, on: true }])),
    ).toEqual(sideState({ leadOnTrade: true, leadBumpedAt: "now", takesSwaps: false }));
  });

  test("an intent on a side already on keeps its bump", () => {
    const before = [row(10, 1, null, sideState({ leadOnTrade: true, leadBumpedAt: "side" }))];
    expect(
      rowStateOf(
        { leadListId: 1, wantListId: null },
        ctx([stored(1, "have")], before, [{ listId: 1, on: true }]),
      ),
    ).toEqual(sideState({ leadOnTrade: true, leadBumpedAt: "side" }));
  });

  test("an intent off keeps the old side's bump and the row's Open to", () => {
    const before = [
      row(10, 2, null, sideState({ leadOnTrade: true, leadBumpedAt: "side", matchHave: false })),
    ];
    expect(
      rowStateOf(
        { leadListId: 2, wantListId: null },
        ctx([stored(2, "want")], before, [{ listId: 2, on: false }]),
      ),
    ).toEqual(sideState({ leadOnTrade: false, leadBumpedAt: "side", matchHave: false }));
  });

  test("Open to and takes_swaps come from the intent", () => {
    const before = [row(10, 1, 2, sideState({ leadOnTrade: true, wantOnTrade: true }))];
    const lists = [stored(1, "sale"), stored(2, "want")];
    expect(
      rowStateOf(
        { leadListId: 1, wantListId: 2 },
        ctx(lists, before, [
          { listId: 1, on: true, takesSwaps: false },
          { listId: 2, on: true, matchHave: false, matchSale: true },
        ]),
      ),
    ).toEqual(
      sideState({
        leadOnTrade: true,
        wantOnTrade: true,
        matchHave: false,
        matchSale: true,
        takesSwaps: false,
      }),
    );
  });

  test("a list moving from a Buy post's lead to a pair's want side carries its side and Open to", () => {
    const before = [
      row(10, 2, null, sideState({ leadOnTrade: true, leadBumpedAt: "side", matchHave: false })),
      row(11, 1, null, sideState({ leadBumpedAt: "have" })),
    ];
    const lists = [stored(1, "have"), stored(2, "want")];
    expect(rowStateOf({ leadListId: 1, wantListId: 2 }, ctx(lists, before))).toEqual(
      sideState({
        leadBumpedAt: "have",
        wantOnTrade: true,
        wantBumpedAt: "side",
        matchHave: false,
      }),
    );
  });

  test("a sale lead moving rows carries its takes_swaps", () => {
    const before = [
      row(10, 1, 2, sideState({ leadOnTrade: true, leadBumpedAt: "side", takesSwaps: false })),
    ];
    const lists = [stored(1, "sale"), stored(2, "want")];
    expect(rowStateOf({ leadListId: 1, wantListId: null }, ctx(lists, before))).toEqual(
      sideState({ leadOnTrade: true, leadBumpedAt: "side", takesSwaps: false }),
    );
  });

  test("a created list with no intent is off, with the defaults", () => {
    const created = stored(3, "want");
    expect(rowStateOf({ leadListId: 3, wantListId: null }, ctx([created], []))).toEqual(
      sideState({}),
    );
  });

  test("a list entering a row off, with no side before, has no bump", () => {
    const lists = [stored(1, "have", { discoverable: true }), stored(2, "want")];
    expect(
      rowStateOf({ leadListId: 1, wantListId: 2 }, ctx(lists, [], [{ listId: 2, on: false }])),
    ).toEqual(sideState({}));
  });

  test("a row with no want list, and a have-led row with no open list", () => {
    const before = [
      row(10, 1, null, sideState({ leadOnTrade: true, leadBumpedAt: "side", wantBumpedAt: "x" })),
    ];
    // no want side, Open to the default, takes_swaps false for a have lead
    expect(
      rowStateOf({ leadListId: 1, wantListId: null }, ctx([stored(1, "have")], before)),
    ).toEqual(sideState({ leadOnTrade: true, leadBumpedAt: "side" }));
  });
});

describe("planPostChange with shared lists (decisions 6 and 7)", () => {
  const T0 = "2026-01-01 00:00:00+00";
  const T1 = "2026-02-01 00:00:00+00";
  const T2 = "2026-03-01 00:00:00+00";
  const NOW = "2026-11-21 00:00:00+00";
  const stored = (
    id: number,
    listType: TradeListState["listType"],
    discoverable: boolean,
  ): TradeListState => ({ id, listType, discoverable });
  const sides = (lead: [boolean, string | null], want?: [boolean, string | null]): PostState => ({
    ...DEFAULT_STATE,
    leadOnTrade: lead[0],
    leadBumpedAt: lead[1],
    wantOnTrade: want?.[0] ?? false,
    wantBumpedAt: want?.[1] ?? null,
  });
  // have L 1 is in R1 (10) with want 2, and in R3 (12) with want 5; have 3 leads R2 (11) with want 4
  const lists = [
    stored(1, "have", true),
    stored(2, "want", true),
    stored(3, "have", true),
    stored(4, "want", true),
    stored(5, "want", true),
    stored(6, "want", true),
  ];
  const rows = [
    row(10, 1, 2, sides([true, T0], [true, T0])),
    row(11, 3, 4, sides([true, T0], [true, T0])),
    row(12, 1, 5, sides([true, T1], [true, T1])),
  ];
  const run = (write: PostChange, before = { lists, rows }) => {
    const { ops, relinked } = planPostChange({ ...before, bumpAt: NOW }, write);
    return {
      deletes: ops.deletes.map(Number),
      updates: ops.updates.map((update) => ({ ...update, id: Number(update.id) })),
      inserts: ops.inserts,
      moves: ops.moves.map((move) => ({ from: Number(move.from), to: Number(move.to) })),
      states: ops.states.map((entry) => ({ ...entry, id: Number(entry.id) })),
      lists: ops.lists,
      relinked: relinked.toSorted((a, b) => a - b),
    };
  };

  test("a new post with a list already in a post adds a row, and the other post is untouched", () => {
    const fresh = [...lists, stored(7, "want", false)];
    expect(
      run(
        {
          newPost: true,
          pair: [3, 7],
          sides: [
            { listId: 3, on: true },
            { listId: 7, on: true, matchHave: false },
          ],
        },
        { lists: fresh, rows },
      ),
    ).toEqual({
      deletes: [],
      updates: [],
      inserts: [
        {
          leadListId: 3,
          wantListId: 7,
          state: { ...sides([true, NOW], [true, NOW]), matchHave: false },
        },
      ],
      moves: [],
      states: [],
      // list 3 was on Trade already
      lists: [{ id: 7, discoverable: true }],
      relinked: [3, 7],
    });
  });

  test("Edit post on one post dropping a shared list leaves the list's other post", () => {
    expect(
      run({
        post: { row: 12 as PostId, lead: 5 },
        unpair: [1, 5],
        sides: [
          { listId: 1, on: false },
          { listId: 5, on: true },
        ],
      }),
    ).toEqual({
      deletes: [],
      updates: [{ id: 12, leadListId: 5, wantListId: null }],
      // the dropped lead keeps a parked row, off, with the bump its side had
      inserts: [{ leadListId: 1, wantListId: null, state: sides([false, T1]) }],
      moves: [],
      states: [{ id: 12, state: sides([true, T1]) }],
      lists: [],
      relinked: [1, 5],
    });
  });

  test("Edit post on a post swapping out a shared list keeps that post's row and hide", () => {
    // R3 (12) swaps L for a new have list 7; R1 keeps L
    const fresh = [...lists, stored(7, "have", false)];
    expect(
      run(
        {
          post: { row: 12 as PostId, lead: 7 },
          pair: [7, 5],
          sides: [
            { listId: 7, on: true },
            { listId: 5, on: true },
            { listId: 1, on: false },
          ],
        },
        { lists: fresh, rows },
      ),
    ).toEqual({
      deletes: [],
      updates: [{ id: 12, leadListId: 7, wantListId: 5 }],
      inserts: [{ leadListId: 1, wantListId: null, state: sides([false, T1]) }],
      moves: [],
      states: [{ id: 12, state: sides([true, NOW], [true, T1]) }],
      lists: [{ id: 7, discoverable: true }],
      relinked: [1, 5, 7],
    });
  });

  test("Take off Trade of one of a list's posts turns off that row only", () => {
    expect(
      run({
        post: { row: 12 as PostId },
        sides: [
          { listId: 1, on: false },
          { listId: 5, on: false },
        ],
      }),
    ).toEqual({
      deletes: [],
      updates: [],
      inserts: [],
      moves: [],
      states: [{ id: 12, state: sides([false, T1], [false, T1]) }],
      // list 1 stays on Trade in R1; list 5 is in no post on Trade now
      lists: [{ id: 5, discoverable: false }],
      relinked: [],
    });
  });

  test("deleting a list in two rows plans each row: one re-led, one ended", () => {
    const parked = rows.map((entry) =>
      entry.id === 12 ? { ...entry, state: sides([true, T1], [false, T1]) } : entry,
    );
    const off = lists.map((entry) => (entry.id === 5 ? { ...entry, discoverable: false } : entry));
    expect(run({ removed: [1] }, { lists: off, rows: parked })).toEqual({
      deletes: [12],
      updates: [{ id: 10, leadListId: 2, wantListId: null }],
      inserts: [],
      moves: [],
      states: [{ id: 10, state: sides([true, T0]) }],
      lists: [],
      relinked: [2, 5],
    });
  });

  test("a list on in one row and off in another is discoverable", () => {
    const stale = lists.map((entry) =>
      entry.id === 1 ? { ...entry, discoverable: false } : entry,
    );
    // R3's lead side off but bumped later than R1's
    const mixed = rows.map((entry) =>
      entry.id === 12 ? { ...entry, state: sides([false, T2], [true, T1]) } : entry,
    );
    expect(
      run(
        { post: { row: 12 as PostId }, sides: [{ listId: 5, on: true }] },
        { lists: stale, rows: mixed },
      ).lists,
    ).toEqual([{ id: 1, discoverable: true }]);
  });

  test("a merge into the shared list's other post leaves its first post and hide alone", () => {
    // a Buy post of want 6 (13) paired with L in R3; R1 is not in the write
    const merged = [
      rows[0]!,
      rows[1]!,
      row(12, 1, null, sides([true, T1])),
      row(13, 6, null, sides([true, T0])),
    ];
    const result = run(
      {
        post: { row: 12 as PostId, lead: 1 },
        pair: [1, 6],
        sides: [
          { listId: 1, on: true },
          { listId: 6, on: true },
        ],
      },
      { lists, rows: merged },
    );
    expect(result.deletes).toEqual([13]);
    expect(result.updates).toEqual([{ id: 12, wantListId: 6 }]);
    expect(result.moves).toEqual([{ from: 13, to: 12 }]);
    expect(result.states.map((entry) => entry.id)).toEqual([12]);
  });
});
