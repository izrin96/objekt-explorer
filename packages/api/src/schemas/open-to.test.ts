import { describe, expect, test } from "bun:test";

import { flagsOf, openToOf, type OpenTo, pairRefusesOpenTo } from "./open-to";

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

describe("pairRefusesOpenTo", () => {
  test("a linked want list can't be Buying only", () => {
    expect(pairRefusesOpenTo(flagsOf("buying"))).toBe(true);
  });

  test("a linked want list open to swaps is allowed", () => {
    expect(pairRefusesOpenTo(flagsOf("swaps"))).toBe(false);
    expect(pairRefusesOpenTo(flagsOf("both"))).toBe(false);
  });
});
