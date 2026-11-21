import type { ListType } from "../schemas/list";
import type { OpenToFlags } from "../schemas/open-to";

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

export type SideList = OpenToFlags & { id: number; listType: ListType; takesSwaps: boolean };

/**
 * The list's side in `row`: its Trade state and bump, and, while that side is on Trade, a want
 * list's Open to and a sale list's `takes_swaps` from the row; off Trade, or for any other list,
 * the list's own, since a row's Open to may lag an off-Trade `list.edit`. `sideStateSql` is its
 * SQL twin.
 */
export function sideStateOf(row: PostRow, list: SideList) {
  const lead = row.leadListId === list.id;
  const onTrade = lead ? row.leadOnTrade : row.wantOnTrade;
  const fromRow = (type: ListType) => onTrade && list.listType === type;
  return {
    onTrade,
    bumpedAt: lead ? row.leadBumpedAt : row.wantBumpedAt,
    matchHave: fromRow("want") ? row.matchHave : list.matchHave,
    matchSale: fromRow("want") ? row.matchSale : list.matchSale,
    takesSwaps: fromRow("sale") ? row.takesSwaps : list.takesSwaps,
  };
}
