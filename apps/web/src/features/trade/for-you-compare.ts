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
export type TradeList = { name: string; listTypeNew: "have" | "want" | "sale" };

/** the kind of list a one-way view compares; both ways it is either */
export const SIDE: Record<TradeFilter, Compared> = {
  all: "both",
  mutual: "both",
  they_want: "have",
  they_have: "want",
};

/**
 * Per kind compared: the All option and what is compared. Both ways, a named list narrows
 * only its own direction, so the other keeps every list; a one-way view names only its side.
 */
export const COMPARE: Record<
  Compared,
  { allLabel: () => string; all: () => string; one: (list: TradeList) => string }
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
    one: (list) =>
      tradeSideOf(list.listTypeNew) === "have"
        ? m.trade_compare_have({ list: list.name })
        : m.trade_compare_want({ list: list.name }),
  },
};

/** no list slug is this short, so it cannot collide with one */
export const ALL_LISTS = "all";
