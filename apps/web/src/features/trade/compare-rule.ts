import { canBeOnTrade, pickedSides } from "@repo/api/schemas/list";
import type { PostType } from "@repo/api/schemas/trade";

export type TradeList = {
  id: number;
  slug: string;
  name: string;
  listType: "have" | "want" | "sale";
  linkedListId: number | null;
};

/** The viewer's lists that take part in Trade, as Compare with offers them. */
export function tradeListsOf(
  lists: readonly {
    id: number;
    slug: string;
    name: string;
    listType: TradeList["listType"] | "general";
    isProfileBind: boolean;
    linkedList?: { id: number } | null;
  }[],
): TradeList[] {
  return lists.flatMap((list) =>
    list.listType !== "general" && canBeOnTrade(list.listType, list.isProfileBind)
      ? [
          {
            id: list.id,
            slug: list.slug,
            name: list.name,
            listType: list.listType,
            linkedListId: list.linkedList?.id ?? null,
          },
        ]
      : [],
  );
}

/** A list's partner when it compares with one, and the directions it can answer. */
export function pickOf(list: TradeList, tradeLists: readonly TradeList[]) {
  const sides = pickedSides(list, tradeLists);
  return {
    paired: sides.paired,
    ways: { have: sides.haveListIds.length > 0, want: sides.wantListIds.length > 0 },
  };
}

export type Scope = { mutual: boolean; type: PostType };

/** The scope a Match mode and a Post type make; Mutual lists WTT posts only, whatever the type says. */
export function scopeOf(mode: string, type: PostType): Scope {
  const mutual = mode === "mutual";
  return { mutual, type: mutual ? "wtt" : type };
}

/** Why a list can't be picked: Mutual needs both ways. */
export type CompareRefusal = "oneWay";

/**
 * What Compare with names. Mutual needs both directions, so a one-way list cannot be picked there.
 * The Post type disables nothing: since a Sell post can take swaps, and a Sell or Swap post can also
 * pay, every Post type holds posts that any of the viewer's lists can match (a Sell or swap
 * post's sale side rings every want list, even one that is Buying only). Null when the list can be
 * picked.
 */
export function compareRefusal(
  list: TradeList,
  tradeLists: readonly TradeList[],
  scope: Scope,
): CompareRefusal | null {
  const { ways } = pickOf(list, tradeLists);
  return scope.mutual && !(ways.have && ways.want) ? "oneWay" : null;
}

export const canCompare = (list: TradeList, tradeLists: readonly TradeList[], scope: Scope) =>
  compareRefusal(list, tradeLists, scope) === null;

/** The list Compare with names; a slug that is not mine, or that Mutual can't use, reads as All my lists. */
export function comparedList(
  slug: string | undefined,
  tradeLists: readonly TradeList[],
  scope: Scope,
) {
  return tradeLists.find((item) => item.slug === slug && canCompare(item, tradeLists, scope));
}
