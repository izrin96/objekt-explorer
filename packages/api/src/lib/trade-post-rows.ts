/** A `trade_post.id`. Branded so a list id is never passed where a post is meant. */
export type PostId = number & { readonly __brand: "PostId" };

export type PostRow = { id: PostId; leadListId: number; wantListId: number | null };

/** One of a person's have, sale or want lists, as it stands after a write. */
export type RowList = {
  id: number;
  listType: "have" | "sale" | "want";
  discoverable: boolean;
  /** `lists.linked_list_id` */
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

  // the link read from the have or sale side, as `leadsPairSql` reads it; two lists naming one
  // want list should not happen, and the lower id keeps it so no list sits in two rows
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
