import { describe, expect, test } from "bun:test";

import type { ListType } from "@repo/api/schemas/list";

import { offTradeOpenTo } from "./list-open-to";

type Flags = {
  discoverable?: boolean | null;
  matchSale?: boolean | null;
  matchHave?: boolean | null;
};

const list = (listType: ListType, rest: Flags = {}) => ({
  listType,
  discoverable: false,
  matchSale: true,
  matchHave: true,
  ...rest,
});

describe("offTradeOpenTo", () => {
  test("names each Open to of a want list off Trade", () => {
    expect(offTradeOpenTo(list("want", { matchSale: false }))).toBe("swaps");
    expect(offTradeOpenTo(list("want"))).toBe("both");
    expect(offTradeOpenTo(list("want", { matchHave: false }))).toBe("buying");
  });

  test("a want list read without Open to takes the default, swaps or buying", () => {
    expect(
      offTradeOpenTo(list("want", { discoverable: null, matchSale: null, matchHave: null })),
    ).toBe("both");
    expect(offTradeOpenTo({ listType: "want" })).toBe("both");
  });

  test("nothing while the list is on Trade, where its tags say it", () => {
    expect(offTradeOpenTo(list("want", { discoverable: true, matchHave: false }))).toBeNull();
  });

  test("nothing for have, sale and general lists", () => {
    for (const type of ["have", "sale", "general"] as const) {
      expect(offTradeOpenTo(list(type))).toBeNull();
    }
  });
});
