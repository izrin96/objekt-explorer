import { canBeOnTrade, pickedSides, tradeSideOf } from "@repo/api/schemas/list";
import { openToOf } from "@repo/api/schemas/open-to";
import type { PostType } from "@repo/api/schemas/trade";

export type TradeList = {
  id: number;
  slug: string;
  name: string;
  listType: "have" | "want" | "sale";
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
    listType: TradeList["listType"] | "general";
    isProfileBind: boolean;
    linkedList?: { id: number } | null;
    matchSale?: boolean | null;
    matchHave?: boolean | null;
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
  if (list?.listType !== "want" || !(list.matchSale || list.matchHave)) return undefined;
  return openToOf(list);
}

/** Why a list can't be picked: Mutual needs both ways, or the Post type has nothing for it. */
export type CompareRefusal = "oneWay" | "wtb" | "wts" | "wtt";

/**
 * What Compare with names. Mutual needs both directions, so a one-way list cannot be picked
 * there. A WTS post is a sale list matched against want lists open to buying, so only such a want
 * list is offered, not its linked have list, which would compare the same pair under a type it
 * can't match. A WTB post is a want list open to buying, alone or paired with a have list (a Swap
 * post that would also pay), so the viewer's have and sale lists match its want side and a want
 * list open to swaps matches a pair's have side; a Buying only want list matches neither. A WTT
 * post holds a have list or a want list open to swaps, so a selection needs a have side or a want
 * list open to swaps. Null when the list can be picked, else the first rule it fails.
 */
export function compareRefusal(
  list: TradeList,
  tradeLists: readonly TradeList[],
  scope: Scope,
): CompareRefusal | null {
  const { ways, paired } = pickOf(list, tradeLists);
  if (scope.mutual && !(ways.have && ways.want)) return "oneWay";
  const openTo = [list, paired].map(openToIn);
  if (scope.type === "wtb")
    return tradeSideOf(list.listType) === "have" || openTo[0] === "swaps" || openTo[0] === "both"
      ? null
      : "wtb";
  if (scope.type === "wts") return openTo[0] === "buying" || openTo[0] === "both" ? null : "wts";
  if (scope.type === "wtt")
    return ways.have || openTo.some((to) => to === "swaps" || to === "both") ? null : "wtt";
  return null;
}

export const canCompare = (list: TradeList, tradeLists: readonly TradeList[], scope: Scope) =>
  compareRefusal(list, tradeLists, scope) === null;

/** The list Compare with names; a slug that is not mine, or that Mutual or the Post type can't use, reads as All my lists. */
export function comparedList(
  slug: string | undefined,
  tradeLists: readonly TradeList[],
  scope: Scope,
) {
  return tradeLists.find((item) => item.slug === slug && canCompare(item, tradeLists, scope));
}
