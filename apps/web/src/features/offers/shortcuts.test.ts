import { describe, expect, test } from "bun:test";

import { SHORTCUT_LIMIT, shortcutItems } from "./shortcuts";

const entries = Array.from({ length: 20 }, (_, i) => i + 1);

describe("shortcutItems", () => {
  test("in list order, cut at the limit", () => {
    expect(shortcutItems(entries, { first: () => false, added: () => false })).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  test("a match past the cut leads", () => {
    const shown = shortcutItems(entries, { first: (n) => n === 15, added: () => false });
    expect(shown[0]).toBe(15);
    expect(shown).toHaveLength(SHORTCUT_LIMIT);
    expect(shown.slice(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("an added one leaves and the next takes its place", () => {
    const shown = shortcutItems(entries.slice(0, 12), {
      first: () => false,
      added: (n) => n === 3,
    });
    expect(shown).toEqual([1, 2, 4, 5, 6, 7, 8, 9]);
  });

  test("an added match leaves too", () => {
    const shown = shortcutItems(entries, { first: (n) => n === 15, added: (n) => n === 15 });
    expect(shown).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
