import { DEFAULT_OPEN_TO } from "./trade-post-state";

/** A `trade_post.id`. Branded so a list id is never passed where a post is meant. */
export type PostId = number & { readonly __brand: "PostId" };

export type PostRow = {
  id: PostId;
  leadListId: number;
  wantListId: number | null;
  state: PostState;
};

/** A post's own Trade state, per side; `trade_post`'s state columns. */
export type PostState = {
  leadOnTrade: boolean;
  leadBumpedAt: string | null;
  wantOnTrade: boolean;
  wantBumpedAt: string | null;
  matchHave: boolean;
  matchSale: boolean;
  takesSwaps: boolean;
};

/** One of a person's have, sale or want lists, as it stands after a write. */
export type RowList = {
  id: number;
  listType: "have" | "sale" | "want";
  discoverable: boolean;
  /** the list's partner after the write */
  linkedListId: number | null;
};

export type PostRowOps = {
  deletes: PostId[];
  /** `leadListId` is set only when the row changes its lead and keeps its id */
  updates: { id: PostId; leadListId?: number; wantListId: number | null }[];
  inserts: { leadListId: number; wantListId: number | null }[];
  /** hides to move, from a row that lost its lead or goes to the surviving row now holding that lead */
  moves: { from: PostId; to: PostId }[];
};

type RowWrites = Omit<PostRowOps, "moves">;

/**
 * The writes that turn one person's `trade_post` rows into the rows their lists call for:
 *
 * 1. A have or sale list leads one row if it links to a want list, is `discoverable`, or already
 *    leads a row. The row holds its linked want list.
 * 2. A want list no have or sale list links to leads one row if it is `discoverable` or already
 *    leads one.
 * 3. Every other row goes.
 *
 * It plans the rows and lists it is given: `planPostChange` gives it one component of a write. A
 * lead keeps its lowest row, so its post id stays.
 *
 * A post keeps its id while it stays one post: no plan deletes a row and inserts another that
 * holds one of its lists. Such a pair becomes one update that changes the row's lead: a Buy post
 * that gains a have list with no row, or a row whose lead is gone and whose want list now leads.
 * Two posts merged still lose one id, and a split still makes one. On a merge the lead's row
 * stays, unless `live` says the want list was on Trade before the write and the lead was not:
 * then the want list's row stays, so the post a person was editing keeps its id over a row
 * left behind by a list taken off Trade.
 *
 * A hide follows its row's lead: a row that is deleted, or handed to another list, passes its
 * hides to the surviving row that now holds its old lead (`moves`), and keeps them otherwise.
 *
 * `post` names an edited post (Edit post): its row goes to `post.lead`, so the post keeps its id
 * and its hides, and the list the row led gets a row of its own, as any lead keeps one.
 */
export function planPostRows(
  rows: readonly PostRow[],
  lists: readonly RowList[],
  live?: ReadonlySet<number>,
  post?: { row: PostId; lead?: number } | null,
): PostRowOps {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const ops: RowWrites = { deletes: [], updates: [], inserts: [] };

  const kept = new Map<number, PostRow>();
  for (const row of rows.toSorted((a, b) => a.id - b.id)) {
    if (kept.has(row.leadListId)) ops.deletes.push(row.id);
    else kept.set(row.leadListId, row);
  }

  // the partner read from the have or sale side; `planPostChange` hands over a matching, so two
  // lists naming one want list should not happen, and the lower id keeps it so no list sits in
  // two rows
  const wantOf = new Map<number, number>();
  const taken = new Set<number>();
  for (const list of lists.toSorted((a, b) => a.id - b.id)) {
    if (list.listType === "want" || list.linkedListId === null) continue;
    const want = byId.get(list.linkedListId);
    if (want?.listType !== "want" || taken.has(want.id)) continue;
    wantOf.set(list.id, want.id);
    taken.add(want.id);
  }

  // Edit post: the edited row goes to the post's lead after the save, so the post keeps its id;
  // the list it led keeps a row of its own, as any lead does
  const ledBefore = new Set(rows.map((row) => row.leadListId));
  const edited = post?.lead === undefined ? undefined : rows.find((row) => row.id === post.row);
  const handed =
    edited !== undefined &&
    kept.get(edited.leadListId) === edited &&
    edited.leadListId !== post!.lead &&
    edited.leadListId !== wantOf.get(post!.lead!);
  if (handed) {
    const lead = post!.lead!;
    const had = kept.get(lead);
    if (had) ops.deletes.push(had.id);
    kept.delete(edited.leadListId);
    kept.set(lead, edited);
  }

  for (const list of lists) {
    const row = kept.get(list.id);
    const wantListId = wantOf.get(list.id) ?? null;
    const leads =
      list.listType === "want"
        ? !taken.has(list.id) && (list.discoverable || ledBefore.has(list.id))
        : wantListId !== null || list.discoverable || ledBefore.has(list.id);
    if (!leads) continue;
    kept.delete(list.id);
    const wantRow = wantListId === null ? undefined : kept.get(wantListId);
    if (
      row &&
      wantRow &&
      !(handed && row === edited) &&
      live?.has(wantListId!) &&
      !live.has(list.id)
    ) {
      kept.delete(wantListId!);
      ops.deletes.push(row.id);
      ops.updates.push({ id: wantRow.id, leadListId: list.id, wantListId });
      continue;
    }
    if (!row) ops.inserts.push({ leadListId: list.id, wantListId });
    else if (row.leadListId !== list.id) {
      ops.updates.push({ id: row.id, leadListId: list.id, wantListId });
    } else if (row.wantListId !== wantListId) ops.updates.push({ id: row.id, wantListId });
  }

  // what is left leads nothing: its list is gone, or a have or sale list took it as its want list
  for (const row of kept.values()) ops.deletes.push(row.id);
  const written = relead(rows, ops);
  return { ...written, moves: movesOf(rows, written) };
}

/** Turns each insert that shares a list with a row the plan deletes into an update of that row. */
function relead(rows: readonly PostRow[], ops: RowWrites): RowWrites {
  if (ops.inserts.length === 0 || ops.deletes.length === 0) return ops;
  const doomed = new Set<number>(ops.deletes);
  const candidates = rows.filter((row) => doomed.has(row.id)).toSorted((a, b) => a.id - b.id);
  const inserts: RowWrites["inserts"] = [];
  const updates = [...ops.updates];
  for (const insert of ops.inserts) {
    const holds = (id: number | null) =>
      id !== null && (id === insert.leadListId || id === insert.wantListId);
    const row = candidates.find(
      (entry) => doomed.has(entry.id) && (holds(entry.leadListId) || holds(entry.wantListId)),
    );
    if (!row) {
      inserts.push(insert);
      continue;
    }
    doomed.delete(row.id);
    updates.push({ id: row.id, leadListId: insert.leadListId, wantListId: insert.wantListId });
  }
  return { deletes: ops.deletes.filter((id) => doomed.has(id)), updates, inserts };
}

/**
 * Where each hide goes: from a row that was deleted or lost its lead, to the surviving row now
 * holding that lead. Inserts have no id yet, and a list that lands only in one is a post of its
 * own, which the hide does not follow.
 */
function movesOf(rows: readonly PostRow[], ops: RowWrites): PostRowOps["moves"] {
  const deleted = new Set<number>(ops.deletes);
  const after = new Map(
    rows.flatMap((row) =>
      deleted.has(row.id)
        ? []
        : [
            [
              row.id,
              { id: row.id, leadListId: row.leadListId, wantListId: row.wantListId },
            ] as const,
          ],
    ),
  );
  for (const update of ops.updates) {
    const row = after.get(update.id)!;
    after.set(update.id, {
      id: row.id,
      leadListId: update.leadListId ?? row.leadListId,
      wantListId: update.wantListId,
    });
  }
  const holder = (listId: number) =>
    [...after.values()].find((row) => row.leadListId === listId || row.wantListId === listId);
  return rows.flatMap((row) => {
    if (after.get(row.id)?.leadListId === row.leadListId) return [];
    const to = holder(row.leadListId);
    return to && to.id !== row.id ? [{ from: row.id, to: to.id }] : [];
  });
}

/** The row of the post a list is in: the lowest row it leads, else the lowest row it is the want list of. */
export function postRowOf(rows: readonly PostRow[], listId: number): PostId | null {
  const lowest = (match: (row: PostRow) => boolean) =>
    rows.reduce<PostId | null>(
      (best, row) => (match(row) && (best === null || row.id < best) ? row.id : best),
      null,
    );
  return lowest((row) => row.leadListId === listId) ?? lowest((row) => row.wantListId === listId);
}

export type PairChange = {
  /** a have or sale list and a want list, in either order */
  pair?: readonly [number, number] | null;
  /** lists that leave their pair, with their partner */
  unpair?: readonly number[];
};

/**
 * Each list's partner by the rows: a lead's want list, a want list's lead. The lowest row id
 * wins, as `postPartnerSql` reads it; a list the lowest row already placed is left out of a later
 * row, which is the row set `planPostRows` then writes.
 */
export function partnersOf(rows: readonly PostRow[]): Map<number, number> {
  const partners = new Map<number, number>();
  const led = new Set<number>();
  for (const row of rows.toSorted((a, b) => a.id - b.id)) {
    if (led.has(row.leadListId)) continue;
    led.add(row.leadListId);
    if (row.wantListId === null) continue;
    if (partners.has(row.leadListId) || partners.has(row.wantListId)) continue;
    partners.set(row.leadListId, row.wantListId);
    partners.set(row.wantListId, row.leadListId);
  }
  return partners;
}

function unpair(partners: Map<number, number>, id: number) {
  const partner = partners.get(id);
  if (partner === undefined) return;
  partners.delete(id);
  partners.delete(partner);
}

/** The partners after a write: each unpair first, then the pair, which first unpairs both lists. */
export function applyPairing(
  partners: ReadonlyMap<number, number>,
  change: PairChange,
): Map<number, number> {
  const next = new Map(partners);
  for (const id of change.unpair ?? []) unpair(next, id);
  if (change.pair) {
    const [a, b] = change.pair;
    unpair(next, a);
    unpair(next, b);
    next.set(a, b);
    next.set(b, a);
  }
  return next;
}

/** A have, sale or want list as a write leaves it, as a statement read or returned it. */
export type TradeListState = {
  id: number;
  listType: RowList["listType"];
  discoverable: boolean;
};

const STATE_KEYS = [
  "leadOnTrade",
  "leadBumpedAt",
  "wantOnTrade",
  "wantBumpedAt",
  "matchHave",
  "matchSale",
  "takesSwaps",
] as const satisfies readonly (keyof PostState)[];

function sameState(a: PostState, b: PostState) {
  return STATE_KEYS.every((key) => a[key] === b[key]);
}

/** What a write sets on a list's side, in the row the write puts it in. */
export type SideIntent = {
  listId: number;
  on: boolean;
  /** the post's want-side Open to, when the list is its open list */
  matchHave?: boolean;
  matchSale?: boolean;
  /** a sale lead's `takes_swaps` */
  takesSwaps?: boolean;
};

export type PostChange = PairChange & {
  /** the post the write edits or takes off Trade, and the list that leads it after an edit */
  post?: { row: PostId; lead?: number } | null;
  /** the write's post goes into a row of its own, beside any row its lists are in */
  newPost?: boolean;
  /** the Trade state the write sets, per list */
  sides?: readonly SideIntent[];
  /** a list the write inserted, as its insert returned it */
  created?: TradeListState | null;
  /** lists the write is about to delete; the plan takes them out of the rows itself */
  removed?: readonly number[];
};

/** A list's `discoverable`, as its rows give it. */
export type ListSummary = { id: number; discoverable: boolean };

/** `PostRowOps` with each row's state, and the lists' summaries. */
export type PostChangeOps = Omit<PostRowOps, "inserts"> & {
  /** an insert carries its own state */
  inserts: { leadListId: number; wantListId: number | null; state: PostState }[];
  /** surviving rows whose state differs from the stored one, rows the plan updates included */
  states: { id: PostId; state: PostState }[];
  /** lists whose summary differs from the stored one */
  lists: ListSummary[];
};

export type PostChangePlan = {
  ops: PostChangeOps;
  /** lists still there whose partner the write changed: the ones to `touchList` */
  relinked: number[];
};

const holds = (row: PostRow, listId: number) =>
  row.leadListId === listId || row.wantListId === listId;

/**
 * The rows a write is about, as components of row ids: one for the post it names and the rows of
 * the lists it names (in `post.row` when a list is there, else `postRowOf`), then one per row
 * holding a removed list. A `newPost` names no row. No list may sit in two rows of one component.
 */
export function componentOf(rows: readonly PostRow[], write: PostChange): PostId[][] {
  const removed = new Set(write.removed);
  const named = [
    ...(write.pair ?? []),
    ...(write.unpair ?? []),
    ...(write.sides ?? []).map((side) => side.listId),
  ];
  const byId = new Map(rows.map((row) => [row.id as number, row]));
  const components: PostId[][] = [];

  if (write.post || named.length > 0) {
    const main = new Set<PostId>();
    if (!write.newPost) {
      const edited = write.post ? byId.get(write.post.row) : undefined;
      if (edited) main.add(edited.id);
      for (const id of named) {
        const row = edited && holds(edited, id) ? edited.id : postRowOf(rows, id);
        if (row !== null) main.add(row);
      }
    }
    components.push([...main].toSorted((a, b) => a - b));
  }

  const taken = new Set<number>(components.flat());
  for (const row of rows.toSorted((a, b) => a.id - b.id)) {
    if (taken.has(row.id) || ![...removed].some((id) => holds(row, id))) continue;
    taken.add(row.id);
    components.push([row.id]);
  }

  for (const component of components) {
    const seen = new Set<number>();
    for (const id of component) {
      const row = byId.get(id)!;
      for (const listId of [row.leadListId, row.wantListId]) {
        if (listId === null) continue;
        if (seen.has(listId)) throw new Error("a list in two rows of one write");
        seen.add(listId);
      }
    }
  }
  return components;
}

/** What `rowStateOf` reads: the write's intents and the component as it was before the write. */
export type StateContext = {
  /** each list as stored, or as its insert returned it */
  lists: ReadonlyMap<number, TradeListState>;
  /** the component's rows before the write */
  before: readonly PostRow[];
  intents: ReadonlyMap<number, SideIntent>;
  /** the person's turn-on bump time, read once under the lock */
  bumpAt: string;
};

/**
 * A row's state after a write (design decision 4). A list with an intent takes its `on`; its bump
 * stays when its side was on, else a turn-on takes `bumpAt`. Any other list brings the side it had
 * in the component, or comes in off. A list entering the rows off has no bump: no read takes an
 * off side's, and a later turn-on takes `bumpAt`. Open to and `takes_swaps` come from the intent,
 * else from the row the list was the open list or sale lead of, else the defaults (Swaps or
 * buying, Sell only): a list moving between rows keeps its post's values, and the rows are the
 * only copy.
 */
export function rowStateOf(
  row: { leadListId: number; wantListId: number | null },
  ctx: StateContext,
): PostState {
  const typeOf = (id: number) => ctx.lists.get(id)!.listType;
  const openOf = (r: { leadListId: number; wantListId: number | null }) =>
    r.wantListId ?? (typeOf(r.leadListId) === "want" ? r.leadListId : null);
  const sideBefore = (id: number) => {
    for (const old of ctx.before) {
      if (old.leadListId === id) {
        return { row: old, on: old.state.leadOnTrade, bumpedAt: old.state.leadBumpedAt };
      }
      if (old.wantListId === id) {
        return { row: old, on: old.state.wantOnTrade, bumpedAt: old.state.wantBumpedAt };
      }
    }
    return null;
  };
  const side = (id: number) => {
    const intent = ctx.intents.get(id);
    const old = sideBefore(id);
    if (!intent)
      return old ? { on: old.on, bumpedAt: old.bumpedAt } : { on: false, bumpedAt: null };
    const bumpedAt = old?.on ? old.bumpedAt : intent.on ? ctx.bumpAt : (old?.bumpedAt ?? null);
    return { on: intent.on, bumpedAt };
  };

  const lead = side(row.leadListId);
  const want = row.wantListId === null ? null : side(row.wantListId);

  const open = openOf(row);
  let { matchHave, matchSale } = DEFAULT_OPEN_TO;
  if (open !== null) {
    const intent = ctx.intents.get(open);
    const old = sideBefore(open);
    const fallback = old && openOf(old.row) === open ? old.row.state : DEFAULT_OPEN_TO;
    matchHave = intent?.matchHave ?? fallback.matchHave;
    matchSale = intent?.matchSale ?? fallback.matchSale;
  }

  let { takesSwaps } = DEFAULT_OPEN_TO;
  if (typeOf(row.leadListId) === "sale") {
    const intent = ctx.intents.get(row.leadListId);
    const old = sideBefore(row.leadListId);
    const fallback = old && old.row.leadListId === row.leadListId ? old.row.state : DEFAULT_OPEN_TO;
    takesSwaps = intent?.takesSwaps ?? fallback.takesSwaps;
  }

  return {
    leadOnTrade: lead.on,
    leadBumpedAt: lead.bumpedAt,
    wantOnTrade: want?.on ?? false,
    wantBumpedAt: want?.bumpedAt ?? null,
    matchHave,
    matchSale,
    takesSwaps,
  };
}

/**
 * One write to a person's posts, planned over the rows it is about (`componentOf`) and nothing
 * else: each component by today's rules (`partnersOf`, `applyPairing`, `planPostRows`), where a
 * list is on when the write's intent says so, else when its side in the component was. Every
 * other row is left as it is, state included, so one list can sit in several posts. Each row of
 * a component takes its state from `rowStateOf`, and `ops.lists` gives each list's
 * `discoverable` from all of the person's rows after the write.
 */
export function planPostChange(
  before: { lists: readonly TradeListState[]; rows: readonly PostRow[]; bumpAt: string },
  write: PostChange,
): PostChangePlan {
  const removed = new Set(write.removed);
  const stored = new Map(before.lists.map((list) => [list.id, list]));
  if (write.created) stored.set(write.created.id, write.created);
  const intents = new Map((write.sides ?? []).map((side) => [side.listId, side]));
  const byId = new Map(before.rows.map((row) => [row.id as number, row]));
  const named = [
    ...(write.pair ?? []),
    ...(write.unpair ?? []),
    ...(write.sides ?? []).map((side) => side.listId),
  ];
  const hasMain = Boolean(write.post) || named.length > 0;

  const ops: PostChangeOps = {
    deletes: [],
    updates: [],
    inserts: [],
    moves: [],
    states: [],
    lists: [],
  };
  const relinked = new Set<number>();
  const touched = new Set<number>(write.created ? [write.created.id] : []);
  // the person's rows after the write, for the summaries
  const after = new Map<
    number,
    { leadListId: number; wantListId: number | null; state: PostState }
  >(before.rows.map((row) => [row.id, row]));
  const added: { leadListId: number; wantListId: number | null; state: PostState }[] = [];

  for (const [index, ids] of componentOf(before.rows, write).entries()) {
    const main = index === 0 && hasMain;
    const rows = ids.map((id) => byId.get(id)!);
    const sideOn = (id: number) =>
      rows.some(
        (row) =>
          (row.leadListId === id && row.state.leadOnTrade) ||
          (row.wantListId === id && row.state.wantOnTrade),
      );
    const members = new Set(rows.flatMap((row) => [row.leadListId, row.wantListId ?? []].flat()));
    if (main) for (const id of named) members.add(id);
    for (const id of removed) members.delete(id);

    // a deleted lead takes its row, a deleted want list leaves it; `planPostRows` starts from the
    // rows as they are, so it can keep the id of a row whose lead goes and whose want list then leads
    const kept = rows.flatMap((row) =>
      removed.has(row.leadListId)
        ? []
        : [
            row.wantListId !== null && removed.has(row.wantListId)
              ? { ...row, wantListId: null }
              : row,
          ],
    );
    const was = partnersOf(rows);
    const partners = main ? applyPairing(partnersOf(kept), write) : partnersOf(kept);

    // by id, the order the identity column numbers a multi-row insert in
    const lists = [...members]
      .toSorted((a, b) => a - b)
      .map((id) => ({
        id,
        listType: stored.get(id)!.listType,
        discoverable: intents.get(id)?.on ?? sideOn(id),
        linkedListId: partners.get(id) ?? null,
      }));
    const live = new Set([...members].filter(sideOn));
    const planned = planPostRows(rows, lists, live, main ? write.post : null);

    const ctx: StateContext = { lists: stored, before: rows, intents, bumpAt: before.bumpAt };
    const gone = new Set<number>(planned.deletes);
    const updates = new Map(planned.updates.map((update) => [update.id as number, update]));
    for (const row of rows) {
      if (gone.has(row.id)) {
        after.delete(row.id);
        continue;
      }
      const update = updates.get(row.id);
      const slots = {
        leadListId: update?.leadListId ?? row.leadListId,
        wantListId: update ? update.wantListId : row.wantListId,
      };
      const state = rowStateOf(slots, ctx);
      after.set(row.id, { ...slots, state });
      if (!sameState(state, row.state)) ops.states.push({ id: row.id, state });
    }
    for (const { leadListId, wantListId } of planned.inserts) {
      const insert = { leadListId, wantListId, state: rowStateOf({ leadListId, wantListId }, ctx) };
      ops.inserts.push(insert);
      added.push(insert);
    }
    ops.deletes.push(...planned.deletes);
    ops.updates.push(...planned.updates);
    ops.moves.push(...planned.moves);
    for (const list of lists) {
      touched.add(list.id);
      if (was.get(list.id) !== partners.get(list.id)) relinked.add(list.id);
    }
  }

  const on = new Set<number>();
  for (const row of [...after.values(), ...added]) {
    if (row.state.leadOnTrade) on.add(row.leadListId);
    if (row.wantListId !== null && row.state.wantOnTrade) on.add(row.wantListId);
  }
  for (const id of touched) {
    if (removed.has(id)) continue;
    const discoverable = on.has(id);
    if (discoverable !== stored.get(id)!.discoverable) ops.lists.push({ id, discoverable });
  }

  return { ops, relinked: [...relinked] };
}
