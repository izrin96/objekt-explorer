import { describe, expect, test } from "bun:test";

import {
  canCompare,
  compareRefusal,
  comparedList,
  type TradeList,
  tradeListsOf,
} from "./compare-rule";

const list = (id: number, slug: string, listType: TradeList["listType"], rest = {}) => ({
  id,
  slug,
  name: slug,
  listType,
  linkedListId: null,
  ...rest,
});

const have = list(1, "have-alone", "have");
const sale = list(2, "sale", "sale");
const want = list(3, "want-alone", "want");
const pair = [
  list(4, "pair-have", "have", { linkedListId: 5 }),
  list(5, "pair-want", "want", { linkedListId: 4 }),
];
const salePair = [
  list(6, "sale-pair-sale", "sale", { linkedListId: 7 }),
  list(7, "sale-pair-want", "want", { linkedListId: 6 }),
];
const lists = [have, sale, want, ...pair, ...salePair];

const usable = (type: "all" | "wtt" | "wtb" | "wts", mutual = false) =>
  lists.filter((item) => canCompare(item, lists, { mutual, type })).map((item) => item.slug);

describe("canCompare", () => {
  test("no Post type disables a list: each holds posts any list can match", () => {
    for (const type of ["all", "wtt", "wtb", "wts"] as const)
      expect(usable(type)).toEqual(lists.map((item) => item.slug));
  });

  test("Mutual needs both ways", () => {
    expect(usable("wtt", true)).toEqual([
      "pair-have",
      "pair-want",
      "sale-pair-sale",
      "sale-pair-want",
    ]);
  });

  test("a want list whose pair is off Trade compares one way", () => {
    const only = [list(9, "want", "want", { linkedListId: 10 })];
    expect(canCompare(only[0]!, only, { mutual: true, type: "wtt" })).toBe(false);
    expect(canCompare(only[0]!, only, { mutual: false, type: "wts" })).toBe(true);
  });
});

describe("compareRefusal", () => {
  test("names Mutual's rule for a one-way list", () => {
    expect(compareRefusal(have, lists, { mutual: true, type: "wtt" })).toBe("oneWay");
    expect(compareRefusal(sale, lists, { mutual: true, type: "wtt" })).toBe("oneWay");
  });

  test("a usable list has none", () => {
    expect(compareRefusal(have, lists, { mutual: false, type: "wts" })).toBeNull();
    expect(compareRefusal(want, lists, { mutual: false, type: "wtb" })).toBeNull();
    expect(compareRefusal(pair[0]!, lists, { mutual: true, type: "wtt" })).toBeNull();
  });
});

describe("comparedList", () => {
  test("a one-way list reads as none under Mutual, and is found otherwise", () => {
    expect(comparedList("have-alone", lists, { mutual: true, type: "wtt" })).toBeUndefined();
    expect(comparedList("have-alone", lists, { mutual: false, type: "wts" })?.id).toBe(1);
  });

  test("an unknown slug is not found", () => {
    expect(comparedList("someone-elses", lists, { mutual: false, type: "all" })).toBeUndefined();
    expect(comparedList(undefined, lists, { mutual: false, type: "all" })).toBeUndefined();
  });
});

describe("tradeListsOf", () => {
  const base = { id: 1, slug: "w", name: "W", isProfileBind: false };

  test("keeps the lists that take part in Trade, with their link", () => {
    const out = tradeListsOf([
      { ...base, listType: "want", linkedList: { id: 2 } },
      { ...base, id: 3, slug: "g", listType: "general" },
    ]);
    expect(out).toEqual([{ id: 1, slug: "w", name: "W", listType: "want", linkedListId: 2 }]);
  });
});
