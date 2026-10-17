import { tradeSideOf } from "@repo/api/schemas/list";

import { m } from "@/paraglide/messages";

import type { TradeList } from "./compare-rule";

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
