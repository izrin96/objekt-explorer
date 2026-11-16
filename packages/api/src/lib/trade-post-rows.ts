/** A `trade_post.id`. Branded so a list id is never passed where a post is meant. */
export type PostId = number & { readonly __brand: "PostId" };

export type PostRow = { id: PostId; leadListId: number; wantListId: number | null };

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
};

/**
 * The writes that turn one person's `trade_post` rows into the rows their lists call for:
 *
 * 1. A have or sale list leads one row if it links to a want list, is `discoverable`, or already
 *    leads a row. The row holds its linked want list.
 * 2. A want list no have or sale list links to leads one row if it is `discoverable` or already
 *    leads one.
 * 3. Every other row goes.
 *
 * It plans the person's whole set, not only the lists a write touched, so any write also repairs
 * rows a build without this left stale. A lead keeps its lowest row, so its post id stays.
 *
 * A post keeps its id while it stays one post: no plan deletes a row and inserts another that
 * holds one of its lists. Such a pair becomes one update that changes the row's lead: a Buy post
 * that gains a have list with no row, or a row whose lead is gone and whose want list now leads.
 * Two posts merged still lose one id, and a split still makes one. On a merge the lead's row
 * stays, unless `live` says the want list was on Trade before the write and the lead was not:
 * then the want list's row stays, so the post a person was editing keeps its id over a row
 * left behind by a list taken off Trade.
 */
export function planPostRows(
  rows: readonly PostRow[],
  lists: readonly RowList[],
  live?: ReadonlySet<number>,
): PostRowOps {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const ops: PostRowOps = { deletes: [], updates: [], inserts: [] };

  const kept = new Map<number, PostRow>();
  for (const row of rows.toSorted((a, b) => a.id - b.id)) {
    if (kept.has(row.leadListId)) ops.deletes.push(row.id);
    else kept.set(row.leadListId, row);
  }

  // the partner read from the have or sale side; `planPostWrite` hands over a matching, so two
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

  for (const list of lists) {
    const row = kept.get(list.id);
    const wantListId = wantOf.get(list.id) ?? null;
    const leads =
      list.listType === "want"
        ? !taken.has(list.id) && (list.discoverable || row !== undefined)
        : wantListId !== null || list.discoverable || row !== undefined;
    if (!leads) continue;
    kept.delete(list.id);
    const wantRow = wantListId === null ? undefined : kept.get(wantListId);
    if (row && wantRow && live?.has(wantListId!) && !live.has(list.id)) {
      kept.delete(wantListId!);
      ops.deletes.push(row.id);
      ops.updates.push({ id: wantRow.id, leadListId: list.id, wantListId });
      continue;
    }
    if (!row) ops.inserts.push({ leadListId: list.id, wantListId });
    else if (row.wantListId !== wantListId) ops.updates.push({ id: row.id, wantListId });
  }

  // what is left leads nothing: its list is gone, or a have or sale list took it as its want list
  for (const row of kept.values()) ops.deletes.push(row.id);
  return relead(rows, ops);
}

/** Turns each insert that shares a list with a row the plan deletes into an update of that row. */
function relead(rows: readonly PostRow[], ops: PostRowOps): PostRowOps {
  if (ops.inserts.length === 0 || ops.deletes.length === 0) return ops;
  const doomed = new Set<number>(ops.deletes);
  const candidates = rows.filter((row) => doomed.has(row.id)).toSorted((a, b) => a.id - b.id);
  const inserts: PostRowOps["inserts"] = [];
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
export type TradeListState = { id: number; listType: RowList["listType"]; discoverable: boolean };

export type PostWrite = PairChange & {
  /** lists the write inserted, or whose `discoverable` it set, as its statements returned them */
  written?: readonly TradeListState[];
  /** lists the write is about to delete; the plan takes them out of the rows itself */
  removed?: readonly number[];
};

export type PostWritePlan = {
  ops: PostRowOps;
  /** lists still there whose partner the write changed: the ones to `touchList` */
  relinked: number[];
};

/**
 * One write to a person's posts, planned in memory: the pairing the write asks for applied to
 * the partners the rows hold, then the rows those lists call for (`planPostRows`).
 */
export function planPostWrite(
  before: { lists: readonly TradeListState[]; rows: readonly PostRow[] },
  write: PostWrite,
): PostWritePlan {
  const removed = new Set(write.removed);
  // the rows without the removed lists, for the partners only: a deleted lead takes its row, a
  // deleted want list leaves it. The plan starts from the rows as they are, so it can keep the
  // id of a row whose lead goes and whose want list then leads.
  const rows = before.rows.flatMap((row) =>
    removed.has(row.leadListId)
      ? []
      : [
          row.wantListId !== null && removed.has(row.wantListId)
            ? { ...row, wantListId: null }
            : row,
        ],
  );
  const was = partnersOf(before.rows);
  const after = applyPairing(partnersOf(rows), write);

  const state = new Map(
    before.lists.flatMap((list) => (removed.has(list.id) ? [] : [[list.id, list] as const])),
  );
  for (const list of write.written ?? []) state.set(list.id, list);
  // by id, the order the identity column numbers a multi-row insert in
  const lists = [...state.values()]
    .toSorted((a, b) => a.id - b.id)
    .map((list) => ({
      id: list.id,
      listType: list.listType,
      discoverable: list.discoverable,
      linkedListId: after.get(list.id) ?? null,
    }));
  const live = new Set(before.lists.flatMap((list) => (list.discoverable ? [list.id] : [])));
  const ops = planPostRows(before.rows, lists, live);

  return {
    ops,
    relinked: lists.flatMap((list) => (was.get(list.id) === after.get(list.id) ? [] : [list.id])),
  };
}
