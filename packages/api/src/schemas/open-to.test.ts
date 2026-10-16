import { describe, expect, test } from "bun:test";

import { flagsOf, openToOf, type OpenTo, resolveOpenTo } from "./open-to";

const BUYING_ONLY = { matchSale: true, matchHave: false };

describe("resolveOpenTo", () => {
  test("a new want list with no matchHave matches have lists", () => {
    expect(resolveOpenTo("want", { matchSale: false })).toEqual({
      matchSale: false,
      matchHave: true,
    });
    expect(resolveOpenTo("want", { matchSale: true })).toEqual({
      matchSale: true,
      matchHave: true,
    });
  });

  test("a new Buying only want list is saved as sent", () => {
    expect(resolveOpenTo("want", { matchSale: true, matchHave: false })).toEqual(BUYING_ONLY);
  });

  test("an old tab's edit to Swaps only restores swaps on a Buying only list", () => {
    expect(resolveOpenTo("want", { matchSale: false }, BUYING_ONLY)).toEqual({
      matchSale: false,
      matchHave: true,
    });
  });

  test("an untouched old tab edit keeps Buying only", () => {
    expect(resolveOpenTo("want", { matchSale: true }, BUYING_ONLY)).toEqual(BUYING_ONLY);
    expect(resolveOpenTo("want", {}, BUYING_ONLY)).toEqual(BUYING_ONLY);
  });

  test("an edit that sends both flags overrides the row", () => {
    expect(resolveOpenTo("want", { matchSale: true, matchHave: true }, BUYING_ONLY)).toEqual({
      matchSale: true,
      matchHave: true,
    });
  });

  test("open to nothing is never saved", () => {
    expect(resolveOpenTo("want", { matchSale: false, matchHave: false })).toEqual({
      matchSale: false,
      matchHave: true,
    });
  });

  test("a list that is not a want list is open to both", () => {
    for (const type of ["general", "have", "sale"] as const) {
      expect(resolveOpenTo(type, { matchSale: false, matchHave: false })).toEqual({
        matchSale: true,
        matchHave: true,
      });
    }
  });
});

describe("openToOf and flagsOf", () => {
  test("each state round-trips through its flags", () => {
    for (const openTo of ["swaps", "both", "buying"] as const satisfies OpenTo[]) {
      expect(openToOf(flagsOf(openTo))).toBe(openTo);
    }
  });

  test("the flags match the stored columns", () => {
    expect(flagsOf("swaps")).toEqual({ matchSale: false, matchHave: true });
    expect(flagsOf("both")).toEqual({ matchSale: true, matchHave: true });
    expect(flagsOf("buying")).toEqual({ matchSale: true, matchHave: false });
  });

  test("a row open to nothing reads as buying", () => {
    expect(openToOf({ matchSale: false, matchHave: false })).toBe("buying");
  });
});
