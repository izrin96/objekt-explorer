import { describe, expect, test } from "bun:test";

import { hasForeignList, hasOtherOwner } from "./offer-ownership";

describe("hasOtherOwner", () => {
  test("no lists, or all theirs, is not foreign", () => {
    expect(hasOtherOwner([], "u")).toBe(false);
    expect(hasOtherOwner(["u", "u"], "u")).toBe(false);
  });

  test("another owner or an unresolved one is", () => {
    expect(hasOtherOwner(["u", "x"], "u")).toBe(true);
    expect(hasOtherOwner(["u", null], "u")).toBe(true);
  });
});

describe("hasForeignList", () => {
  const none = new Set<string>();

  test("a list owned by them is theirs", () => {
    expect(hasForeignList(["a"], ["u"], "u", none)).toBe(false);
  });

  test("a list owned by someone else is foreign", () => {
    expect(hasForeignList(["a"], ["x"], "u", none)).toBe(true);
  });

  test("an ownerless list is theirs when one of their posts holds it", () => {
    expect(hasForeignList(["want"], [null], "u", new Set(["want"]))).toBe(false);
    expect(hasForeignList(["want"], [null], "u", none)).toBe(true);
  });

  test("one foreign list among theirs is enough", () => {
    expect(hasForeignList(["a", "b"], ["u", "x"], "u", new Set(["a"]))).toBe(true);
  });
});
