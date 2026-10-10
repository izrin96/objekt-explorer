import { tradeSideOf } from "@repo/api/schemas/list";
import type { TradeFilter } from "@repo/api/schemas/trade";

import { m } from "@/paraglide/messages";

export const MATCHES: { value: TradeFilter; label: () => string }[] = [
  { value: "all", label: m.trade_show_everyone },
  { value: "mutual", label: m.trade_filter_mutual },
  { value: "they_want", label: m.trade_filter_they_want },
  { value: "they_have", label: m.trade_filter_they_have },
];

type Compared = "have" | "want" | "both";
export type TradeList = {
  id: number;
  slug: string;
  name: string;
  listTypeNew: "have" | "want" | "sale";
  linkedListId: number | null;
};

/** the kind of list a one-way view compares; both ways it is either */
export const SIDE: Record<TradeFilter, Compared> = {
  all: "both",
  mutual: "both",
  they_want: "have",
  they_have: "want",
};

/**
 * Per kind compared: the All option and what is compared. Both ways, a named list compares
 * with the list it links to (`paired`), or one way without one; a one-way view names only its side.
 */
export const COMPARE: Record<
  Compared,
  {
    allLabel: () => string;
    all: () => string;
    one: (list: TradeList, paired: TradeList | undefined) => string;
  }
> = {
  have: {
    allLabel: m.trade_list_all_have,
    all: m.trade_compare_all_have,
    one: (list) => m.trade_compare_have_only({ list: list.name }),
  },
  want: {
    allLabel: m.trade_list_all_want,
    all: m.trade_compare_all_want,
    one: (list) => m.trade_compare_want_only({ list: list.name }),
  },
  both: {
    allLabel: m.trade_list_all,
    all: m.trade_compare_all,
    one: (list, paired) => {
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
  },
};

/** no list slug is this short, so it cannot collide with one */
export const ALL_LISTS = "all";
