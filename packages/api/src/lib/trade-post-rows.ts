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
  updates: { id: PostId; wantListId: number | null }[];
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
 */
export function planPostRows(rows: readonly PostRow[], lists: readonly RowList[]): PostRowOps {
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
    if (!row) ops.inserts.push({ leadListId: list.id, wantListId });
    else if (row.wantListId !== wantListId) ops.updates.push({ id: row.id, wantListId });
  }

  // what is left leads nothing: its list is gone, or a have or sale list took it as its want list
  for (const row of kept.values()) ops.deletes.push(row.id);
  return ops;
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
  /** lists the write deleted; the foreign keys already took them out of the rows and the links */
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
  // what the foreign keys did: a deleted lead takes its row, a deleted want list leaves it
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
  const ops = planPostRows(rows, lists);

  return {
    ops,
    relinked: lists.flatMap((list) => (was.get(list.id) === after.get(list.id) ? [] : [list.id])),
  };
}
