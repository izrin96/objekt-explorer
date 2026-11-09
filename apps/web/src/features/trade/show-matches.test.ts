import { describe, expect, test } from "bun:test";

import { canShowMatches } from "./show-matches";

const list = (over: Partial<Parameters<typeof canShowMatches>[0]> = {}) => ({
  discoverable: true,
  listType: "have" as const,
  isProfileBind: true,
  ...over,
});

describe("canShowMatches", () => {
  test("someone else's list on Trade, for a signed-in viewer", () => {
    expect(canShowMatches(list(), true, false)).toBe(true);
    expect(canShowMatches(list({ listType: "want", isProfileBind: false }), true, false)).toBe(
      true,
    );
  });

  test("never for the owner, a signed-out viewer or a list off Trade", () => {
    expect(canShowMatches(list(), true, true)).toBe(false);
    expect(canShowMatches(list(), false, false)).toBe(false);
    expect(canShowMatches(list({ discoverable: false }), true, false)).toBe(false);
  });

  test("never for a general list or an unbound have list", () => {
    expect(canShowMatches(list({ listType: "general" }), true, false)).toBe(false);
    expect(canShowMatches(list({ isProfileBind: false }), true, false)).toBe(false);
  });
});
