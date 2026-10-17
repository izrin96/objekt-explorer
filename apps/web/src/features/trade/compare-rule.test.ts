import { describe, expect, test } from "bun:test";

import {
  canCompare,
  compareRefusal,
  comparedList,
  type TradeList,
  tradeListsOf,
} from "./compare-rule";

const list = (id: number, slug: string, listTypeNew: TradeList["listTypeNew"], rest = {}) => ({
  id,
  slug,
  name: slug,
  listTypeNew,
  linkedListId: null,
  matchSale: false,
  matchHave: false,
  ...rest,
});

const have = list(1, "have-alone", "have");
const sale = list(2, "sale", "sale");
const swapsWant = list(3, "swaps-want", "want", { matchHave: true });
const buyingWant = list(4, "buying-want", "want", { matchSale: true, matchHave: true });
const buyingOnlyWant = list(10, "buying-only-want", "want", { matchSale: true, matchHave: false });
const swapsPair = [
  list(5, "pair-have", "have", { linkedListId: 6 }),
  list(6, "pair-swaps-want", "want", { linkedListId: 5, matchHave: true }),
];
const buyingPair = [
  list(7, "buy-pair-have", "have", { linkedListId: 8 }),
  list(8, "buy-pair-want", "want", { linkedListId: 7, matchSale: true, matchHave: true }),
];
const buyingOnlyPair = [
  list(11, "bo-pair-have", "have", { linkedListId: 12 }),
  list(12, "bo-pair-want", "want", { linkedListId: 11, matchSale: true, matchHave: false }),
];
const lists = [
  have,
  sale,
  swapsWant,
  buyingWant,
  buyingOnlyWant,
  ...swapsPair,
  ...buyingPair,
  ...buyingOnlyPair,
];

const usable = (type: "all" | "wtt" | "wtb" | "wts", mutual = false) =>
  lists.filter((item) => canCompare(item, lists, { mutual, type })).map((item) => item.slug);

describe("canCompare", () => {
  test("All disables nothing", () => {
    expect(usable("all")).toEqual(lists.map((item) => item.slug));
  });

  test("WTT needs a have side or a want list open to swaps: a lone Buying only want list is disabled", () => {
    expect(usable("wtt")).toEqual(
      lists.map((item) => item.slug).filter((s) => s !== "buying-only-want"),
    );
    expect(usable("wtt")).toContain("bo-pair-want");
  });

  test("WTB needs a have side: a lone want list is disabled", () => {
    expect(usable("wtb")).toEqual([
      "have-alone",
      "sale",
      "pair-have",
      "pair-swaps-want",
      "buy-pair-have",
      "buy-pair-want",
      "bo-pair-have",
      "bo-pair-want",
    ]);
  });

  test("WTS needs a want list open to buying", () => {
    expect(usable("wts")).toEqual([
      "buying-want",
      "buying-only-want",
      "buy-pair-have",
      "buy-pair-want",
      "bo-pair-have",
      "bo-pair-want",
    ]);
  });

  test("Mutual still needs both ways", () => {
    expect(usable("wtt", true)).toEqual([
      "pair-have",
      "pair-swaps-want",
      "buy-pair-have",
      "buy-pair-want",
      "bo-pair-have",
      "bo-pair-want",
    ]);
  });

  test("a want list whose pair is off Trade compares alone", () => {
    const only = [list(9, "want", "want", { linkedListId: 10, matchHave: true })];
    expect(canCompare(only[0]!, only, { mutual: false, type: "wtb" })).toBe(false);
  });
});

describe("compareRefusal", () => {
  test("names the rule a disabled list fails", () => {
    expect(compareRefusal(have, lists, { mutual: true, type: "wtt" })).toBe("oneWay");
    expect(compareRefusal(swapsWant, lists, { mutual: false, type: "wtb" })).toBe("wtb");
    expect(compareRefusal(have, lists, { mutual: false, type: "wts" })).toBe("wts");
    expect(compareRefusal(buyingOnlyWant, lists, { mutual: false, type: "wtt" })).toBe("wtt");
  });

  test("Mutual's rule comes before the type's", () => {
    expect(compareRefusal(buyingOnlyWant, lists, { mutual: true, type: "wtt" })).toBe("oneWay");
  });

  test("a usable list has none", () => {
    expect(compareRefusal(sale, lists, { mutual: false, type: "wtb" })).toBeNull();
    expect(compareRefusal(have, lists, { mutual: false, type: "all" })).toBeNull();
  });
});

describe("comparedList", () => {
  test("a list the type can't use reads as none", () => {
    expect(comparedList("swaps-want", lists, { mutual: false, type: "wtb" })).toBeUndefined();
    expect(comparedList("have-alone", lists, { mutual: false, type: "wts" })).toBeUndefined();
  });

  test("a usable list is found, an unknown slug is not", () => {
    expect(comparedList("sale", lists, { mutual: false, type: "wtb" })?.id).toBe(2);
    expect(comparedList("someone-elses", lists, { mutual: false, type: "all" })).toBeUndefined();
    expect(comparedList(undefined, lists, { mutual: false, type: "all" })).toBeUndefined();
  });
});

describe("tradeListsOf", () => {
  const base = { id: 1, slug: "w", name: "W", listTypeNew: "want" as const, isProfileBind: false };

  test("a nullish matchSale or matchHave reads as off, as the server does", () => {
    const [bare] = tradeListsOf([base]);
    expect(bare).toMatchObject({ matchSale: false, matchHave: false });
    const [nulls] = tradeListsOf([{ ...base, matchSale: null, matchHave: null }]);
    expect(nulls).toMatchObject({ matchSale: false, matchHave: false });
  });

  test("the flags are carried", () => {
    const [list] = tradeListsOf([{ ...base, matchSale: true, matchHave: false }]);
    expect(list).toMatchObject({ matchSale: true, matchHave: false });
  });
});
