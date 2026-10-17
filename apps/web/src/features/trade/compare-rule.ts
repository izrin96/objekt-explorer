import { canBeOnTrade, pickedSides } from "@repo/api/schemas/list";
import { openToOf } from "@repo/api/schemas/open-to";
import type { PostType } from "@repo/api/schemas/trade";

export type TradeList = {
  id: number;
  slug: string;
  name: string;
  listTypeNew: "have" | "want" | "sale";
  linkedListId: number | null;
  /** a want list open to buying: Swaps or buying, or Buying only */
  matchSale: boolean;
  /** a want list open to swaps: Swaps only, or Swaps or buying */
  matchHave: boolean;
};

/** The viewer's lists that take part in Trade, as Compare with offers them. */
export function tradeListsOf(
  lists: readonly {
    id: number;
    slug: string;
    name: string;
    listTypeNew: TradeList["listTypeNew"] | "general";
    isProfileBind: boolean;
    linkedList?: { id: number } | null;
    matchSale?: boolean | null;
    matchHave?: boolean | null;
  }[],
): TradeList[] {
  return lists.flatMap((list) =>
    list.listTypeNew !== "general" && canBeOnTrade(list.listTypeNew, list.isProfileBind)
      ? [
          {
            id: list.id,
            slug: list.slug,
            name: list.name,
            listTypeNew: list.listTypeNew,
            linkedListId: list.linkedList?.id ?? null,
            matchSale: list.matchSale ?? false,
            matchHave: list.matchHave ?? false,
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

/** A want list's Open to; a list with neither flag set (a nullish payload) is open to nothing, where `openToOf` would read buying. */
function openToIn(list: TradeList | undefined) {
  if (list?.listTypeNew !== "want" || !(list.matchSale || list.matchHave)) return undefined;
  return openToOf(list);
}

/**
 * What Compare with names. Mutual needs both directions, so a one-way list cannot be picked
 * there. A WTB post is a want list matched against the viewer's have and sale lists, so it needs
 * a have side; a WTS post is a sale list matched against want lists open to buying. A WTT post
 * holds a have list, matched against want lists open to swaps, so a selection needs a have side
 * or a want list open to swaps (a lone Buying only want list matches no WTT post).
 */
export function canCompare(list: TradeList, tradeLists: readonly TradeList[], scope: Scope) {
  const { ways, paired } = pickOf(list, tradeLists);
  if (scope.mutual && !(ways.have && ways.want)) return false;
  const openTo = [list, paired].map(openToIn);
  if (scope.type === "wtb") return ways.have;
  if (scope.type === "wts") return openTo.some((to) => to === "buying" || to === "both");
  if (scope.type === "wtt")
    return ways.have || openTo.some((to) => to === "swaps" || to === "both");
  return true;
}

/** The list Compare with names; a slug that is not mine, or that Mutual or the Post type can't use, reads as All my lists. */
export function comparedList(
  slug: string | undefined,
  tradeLists: readonly TradeList[],
  scope: Scope,
) {
  return tradeLists.find((item) => item.slug === slug && canCompare(item, tradeLists, scope));
}
