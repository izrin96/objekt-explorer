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
  test("the smaller of the two swap counts, sale lists left out", () => {
    expect(mutualOf({ theyHave: 3, youHave: 2, tradeTheyHave: 1, tradeYouHave: 2 })).toBe(1);
  });

  test("a sale list answered by a buying want list is not mutual", () => {
    const sale = { theyHave: 3, youHave: 2, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(countsFit("mutual", sale)).toBe(false);
  });

  test("a direction with no count, a sale list against a swaps-only want list, is not mutual", () => {
    const swapsOnly = { theyHave: 0, youHave: 2, tradeTheyHave: 0, tradeYouHave: 2 };
    expect(mutualOf(swapsOnly)).toBe(0);
    expect(countsFit("mutual", swapsOnly)).toBe(false);
  });

  test("the one-way fits still count sale matches", () => {
    const sale = { theyHave: 3, youHave: 0, tradeTheyHave: 0, tradeYouHave: 0 };
    expect(countsFit("they_have", sale)).toBe(true);
    expect(countsFit("they_want", sale)).toBe(false);
    expect(countsFit("all", sale)).toBe(true);
  });
});
