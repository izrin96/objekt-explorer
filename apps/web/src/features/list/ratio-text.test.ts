import { describe, expect, test } from "bun:test";

import { appliedRatio, groupRatio, ratioLabel, ratioName, ratioText } from "./ratio-text";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

describe("appliedRatio", () => {
  test("the entry's own wins over the list's", () => {
    expect(appliedRatio(3, 2)).toEqual({ ratio: 3, inherited: false });
  });

  test("an entry without one follows the list", () => {
    expect(appliedRatio(null, 2)).toEqual({ ratio: 2, inherited: true });
    expect(appliedRatio(undefined, 2)).toEqual({ ratio: 2, inherited: true });
  });

  test("neither is 1:1, shown as nothing", () => {
    expect(appliedRatio(null, null)).toBeNull();
    expect(appliedRatio(undefined, undefined)).toBeNull();
  });
});

describe("groupRatio", () => {
  test("a grouped card shows the highest ratio among its copies", () => {
    expect(groupRatio([{ ratio: 2 }, { ratio: 4 }, { ratio: null }], 3)).toEqual({
      ratio: 4,
      inherited: false,
    });
    expect(groupRatio([{ ratio: null }, { ratio: 2 }], 3)).toEqual({ ratio: 3, inherited: true });
  });

  test("an own ratio wins a tie with the list's", () => {
    expect(groupRatio([{ ratio: null }, { ratio: 3 }], 3)).toEqual({ ratio: 3, inherited: false });
  });

  test("no ratio anywhere is none", () => {
    expect(groupRatio([{ ratio: null }, {}], null)).toBeNull();
  });
});

describe("ratioText", () => {
  test("a have entry asks N for one, a want entry gives N for one", () => {
    expect(ratioText(2, "have")).toBe("1:2");
    expect(ratioText(3, "want")).toBe("3:1");
  });
});

describe("ratioName", () => {
  test("the owner reads what they ask or would give", () => {
    check(ratioName(2, "have", { owner: true })).toBe("You ask 2 for this");
    check(ratioName(2, "want", { owner: true })).toBe("You'd give 2 for this");
  });

  test("everyone else, signed out too, reads what they ask or would give", () => {
    check(ratioName(2, "have", { owner: false })).toBe("They ask 2 for this");
    check(ratioName(4, "want", { owner: false })).toBe("They'd give 4 for this");
  });

  test("the owner is told a ratio comes from the list; a visitor is not", () => {
    check(ratioName(2, "have", { owner: true, inherited: true })).toBe(
      "You ask 2 for this, from Ratio for all",
    );
    check(ratioName(2, "have", { owner: false, inherited: true })).toBe("They ask 2 for this");
  });
});

describe("ratioLabel", () => {
  test("starts with the chip's text, then its words mid-sentence", () => {
    check(ratioLabel(2, "have", { owner: true })).toBe("1:2, you ask 2 for this");
    check(ratioLabel(3, "want", { owner: false })).toBe("3:1, they'd give 3 for this");
    check(ratioLabel(2, "have", { owner: true, inherited: true })).toBe(
      "1:2, you ask 2 for this, from Ratio for all",
    );
  });
});
