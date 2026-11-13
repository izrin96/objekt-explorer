import { describe, expect, test } from "bun:test";

import {
  flagsOf,
  openToEdit,
  openToOf,
  type OpenTo,
  pairRefusesOpenTo,
  resolveOpenTo,
} from "./open-to";

const BUYING_ONLY = { matchSale: true, matchHave: false };

describe("resolveOpenTo", () => {
  test("a Swaps only want list matches have lists", () => {
    expect(resolveOpenTo("want", { matchSale: false, matchHave: true })).toEqual({
      matchSale: false,
      matchHave: true,
    });
  });

  test("a new Buying only want list is saved as sent", () => {
    expect(resolveOpenTo("want", BUYING_ONLY)).toEqual(BUYING_ONLY);
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

describe("pairRefusesOpenTo", () => {
  test("a linked want list can't be Buying only", () => {
    expect(pairRefusesOpenTo(flagsOf("buying"))).toBe(true);
  });

  test("a linked want list open to swaps is allowed", () => {
    expect(pairRefusesOpenTo(flagsOf("swaps"))).toBe(false);
    expect(pairRefusesOpenTo(flagsOf("both"))).toBe(false);
  });
});

describe("openToEdit", () => {
  const want = { listType: "want" as const, discoverable: false, linkedListId: null };

  test("a want list off Trade takes the Open to it is sent", () => {
    for (const openTo of ["swaps", "both", "buying"] as const) {
      expect(openToEdit(want, openTo)).toEqual({ action: "write", flags: flagsOf(openTo) });
    }
  });

  test("nothing sent keeps the stored one, as a tab from before it", () => {
    expect(openToEdit(want, undefined)).toEqual({ action: "keep" });
  });

  test("on Trade the post's Open to stays, without refusing the save", () => {
    expect(openToEdit({ ...want, discoverable: true }, "buying")).toEqual({ action: "keep" });
    expect(openToEdit({ ...want, discoverable: true, linkedListId: 7 }, "buying")).toEqual({
      action: "keep",
    });
  });

  test("have, sale and general lists keep theirs", () => {
    for (const listType of ["have", "sale", "general"] as const) {
      expect(openToEdit({ ...want, listType }, "buying")).toEqual({ action: "keep" });
    }
  });

  test("a paired want list off Trade can't be Buying only, and can take swaps", () => {
    const paired = { ...want, linkedListId: 7 };
    expect(openToEdit(paired, "buying")).toEqual({ action: "refuse" });
    expect(openToEdit(paired, "swaps")).toEqual({ action: "write", flags: flagsOf("swaps") });
    expect(openToEdit(paired, "both")).toEqual({ action: "write", flags: flagsOf("both") });
  });
});
