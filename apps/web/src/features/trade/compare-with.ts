import { canBeOnTrade, pickedSides, tradeSideOf } from "@repo/api/schemas/list";

import { m } from "@/paraglide/messages";

export type TradeList = {
  id: number;
  slug: string;
  name: string;
  listTypeNew: "have" | "want" | "sale";
  linkedListId: number | null;
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

/** What Compare with names. Mutual needs both directions, so a list that compares one way cannot be picked there. */
export function canCompare(list: TradeList, tradeLists: readonly TradeList[], mutual: boolean) {
  const { ways } = pickOf(list, tradeLists);
  return !mutual || (ways.have && ways.want);
}

/** The list Compare with names under Mutual or Any; a slug that is not mine, or that Mutual can't use, reads as All my lists. */
export function comparedList(
  slug: string | undefined,
  tradeLists: readonly TradeList[],
  mutual: boolean,
) {
  return tradeLists.find((item) => item.slug === slug && canCompare(item, tradeLists, mutual));
}

export const COMPARE = {
  allLabel: m.trade_list_all,
  /** A named list compares with the list it links to, or one way without one. */
  one: (list: TradeList, paired: TradeList | undefined) => {
    const isHave = tradeSideOf(list.listTypeNew) === "have";
    if (paired) {
      const [have, want] = isHave ? [list, paired] : [paired, list];
      return m.trade_compare_pair({ have: have.name, want: want.name });
    }
    if (list.listTypeNew === "sale") return m.trade_compare_sale_alone({ list: list.name });
    // only a have list can be off Trade, for want of a bound profile
    if (list.linkedListId !== null) return m.trade_compare_want_link_off({ list: list.name });
    return isHave
      ? m.trade_compare_have_alone({ list: list.name })
      : m.trade_compare_want_alone({ list: list.name });
  },
};

/** no list slug is this short, so it cannot collide with one */
export const ALL_LISTS = "all";
