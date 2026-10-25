import { describe, expect, test } from "bun:test";

import { SHORTCUT_LIMIT, shortcutItems, togglePick } from "./shortcuts";

const entries = Array.from({ length: 20 }, (_, i) => i + 1);

describe("shortcutItems", () => {
  test("in list order, cut at the limit", () => {
    expect(shortcutItems(entries, () => false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("a match past the cut leads", () => {
    const shown = shortcutItems(entries, (n) => n === 15);
    expect(shown[0]).toBe(15);
    expect(shown).toHaveLength(SHORTCUT_LIMIT);
    expect(shown.slice(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("togglePick", () => {
  const a = { key: "a" };
  const b = { key: "b" };

  test("an unheld pick joins", () => {
    expect(togglePick([a], [a], b, 50)).toEqual([a, b]);
  });

  test("a held pick leaves", () => {
    expect(togglePick([a, b], [a, b], b, 50)).toEqual([a]);
  });

  test("a full side takes nothing more", () => {
    const current = [a];
    expect(togglePick(current, current, b, 1)).toBe(current);
  });

  test("a resolved copy leaves by the any-copy ask it stands in for", () => {
    const ask = { key: "any:201z" };
    const copy = { key: "token-1", replaces: "any:201z" };
    expect(togglePick([ask, a], [copy, a], { key: "token-1" }, 50)).toEqual([a]);
  });
});
