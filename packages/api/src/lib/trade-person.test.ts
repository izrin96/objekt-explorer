import { describe, expect, test } from "bun:test";

import { countsFit, mutualOf } from "../schemas/trade";
import { matchCounts, viewerListIds } from "./trade-person";

const match = (slug: string, trade: boolean, myListIds: number[] = []) => ({
  slug,
  trade,
  myListIds,
});

describe("matchCounts", () => {
  test("counts distinct collections per direction", () => {
    const counts = matchCounts({
      theyHaveIWant: [match("a", true), match("a", true), match("b", false)],
      iHaveTheyWant: [match("c", true)],
    });
    expect(counts).toEqual({ theyHave: 2, youHave: 1, tradeTheyHave: 1, tradeYouHave: 1 });
  });

  test("trade counts come only from trade matches", () => {
    const counts = matchCounts({
      theyHaveIWant: [match("a", false), match("b", false)],
      iHaveTheyWant: [match("c", false)],
    });
    expect(counts).toEqual({ theyHave: 2, youHave: 1, tradeTheyHave: 0, tradeYouHave: 0 });
  });

  test("viewerListIds gathers each direction's lists once", () => {
    expect(
      viewerListIds({
        theyHaveIWant: [match("a", true, [1, 2]), match("b", true, [2])],
        iHaveTheyWant: [match("c", true, [9])],
      }),
    ).toEqual({ wantListIds: [1, 2], haveListIds: [9] });
  });
});

describe("mutual", () => {
  test("1 ⇄ 2 in trades is 1, though the totals are 3 ⇄ 2", () => {
    expect(mutualOf({ theyHave: 3, youHave: 2, tradeTheyHave: 1, tradeYouHave: 2 })).toBe(1);
  });

  test("a sale-only partner is not mutual, one trade each way is", () => {
    const sale = { theyHave: 3, youHave: 2, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(countsFit("mutual", sale)).toBe(false);
    expect(countsFit("mutual", { ...sale, tradeTheyHave: 1, tradeYouHave: 1 })).toBe(true);
  });

  test("the one-way fits still count sale matches", () => {
    const sale = { theyHave: 3, youHave: 0, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(countsFit("they_have", sale)).toBe(true);
    expect(countsFit("they_want", sale)).toBe(false);
    expect(countsFit("all", sale)).toBe(true);
  });
});
