import type { ListType } from "../schemas/list";

/** A `trade_post` row: its two sides' Trade state and bumps, and the post's Open to. */
export type PostRow = {
  id: number;
  leadListId: number;
  wantListId: number | null;
  leadOnTrade: boolean;
  wantOnTrade: boolean;
  leadBumpedAt: string | null;
  wantBumpedAt: string | null;
  matchHave: boolean;
  matchSale: boolean;
  takesSwaps: boolean;
};

export type SideList = { id: number; listType: ListType };

/** A post's Open to and `takes_swaps`, as a want list and a sale list hold them. */
export type PostOpenTo = { matchHave: boolean; matchSale: boolean; takesSwaps: boolean };

/**
 * What a list in no row reads, and every list but a want list's Open to or a sale list's
 * `takes_swaps`: Swaps or buying, Sell only. `trade_post`'s column defaults.
 */
export const DEFAULT_OPEN_TO: PostOpenTo = { matchHave: true, matchSale: true, takesSwaps: false };

const openToFrom = (listType: ListType, from: PostOpenTo): PostOpenTo => ({
  matchHave: listType === "want" ? from.matchHave : DEFAULT_OPEN_TO.matchHave,
  matchSale: listType === "want" ? from.matchSale : DEFAULT_OPEN_TO.matchSale,
  takesSwaps: listType === "sale" ? from.takesSwaps : DEFAULT_OPEN_TO.takesSwaps,
});

/**
 * The list's side in `row`: its Trade state and bump, a want list's Open to and a sale list's
 * `takes_swaps` from the row, on Trade or off, and the defaults for any other list. The row is
 * the only copy of a post's Open to. `sideStateSql` is its SQL twin.
 */
export function sideStateOf(row: PostRow, list: SideList) {
  const lead = row.leadListId === list.id;
  return {
    onTrade: lead ? row.leadOnTrade : row.wantOnTrade,
    bumpedAt: lead ? row.leadBumpedAt : row.wantBumpedAt,
    ...openToFrom(list.listType, row),
  };
}

/**
 * A list's Open to as a read that names only the list takes it: the union of its sides on Trade,
 * else of every side it has in `rows`, else the defaults; by `sideStateOf`'s type rule.
 * `listTradeStateSql` is its SQL twin.
 */
export function listStateOf(rows: readonly PostRow[], list: SideList): PostOpenTo {
  const sides = rows.flatMap((row) => {
    if (row.leadListId === list.id) return [{ row, onTrade: row.leadOnTrade }];
    if (row.wantListId === list.id) return [{ row, onTrade: row.wantOnTrade }];
    return [];
  });
  const on = sides.filter((side) => side.onTrade);
  const tier = on.length > 0 ? on : sides;
  if (tier.length === 0) return { ...DEFAULT_OPEN_TO };
  return openToFrom(list.listType, {
    matchHave: tier.some(({ row }) => row.matchHave),
    matchSale: tier.some(({ row }) => row.matchSale),
    takesSwaps: tier.some(({ row }) => row.takesSwaps),
  });
}
