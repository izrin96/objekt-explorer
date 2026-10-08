import { describe, expect, test } from "bun:test";

import { SHORTCUT_LIMIT, shortcutItems } from "./shortcuts";

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
