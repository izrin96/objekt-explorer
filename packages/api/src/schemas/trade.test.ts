import { describe, expect, test } from "bun:test";

import { browseInputSchema, filterFits, fullestFilter } from "./trade";

describe("browse cursor", () => {
  test("takes the ISO time the feed emits", () => {
    const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };
    expect(browseInputSchema.parse({ cursor }).cursor).toEqual(cursor);
  });

  test("refuses a time Postgres would choke on", () => {
    for (const bumpedAt of [
      "yesterday",
      "",
      "2026-10-07 09:12:30.123456+00",
      "2026-13-40T00:00:00Z",
    ]) {
      expect(browseInputSchema.safeParse({ cursor: { bumpedAt, id: 12 } }).success).toBe(false);
    }
    expect(
      browseInputSchema.safeParse({ cursor: { bumpedAt: "2026-10-07T09:12:30Z", id: 1.5 } })
        .success,
    ).toBe(false);
  });
});

const both = { have: true, want: true };
const haveOnly = { have: true, want: false };
const wantOnly = { have: false, want: true };

describe("filterFits", () => {
  test("both ways fits every view", () => {
    const filters = ["all", "mutual", "they_want", "they_have"] as const;
    expect(filters.map((filter) => filterFits(filter, both))).toEqual([true, true, true, true]);
  });

  test("one way fits Everyone and its own direction only", () => {
    expect(filterFits("all", haveOnly)).toBe(true);
    expect(filterFits("mutual", haveOnly)).toBe(false);
    expect(filterFits("they_want", haveOnly)).toBe(true);
    expect(filterFits("they_have", haveOnly)).toBe(false);
    expect(filterFits("they_have", wantOnly)).toBe(true);
  });
});

describe("fullestFilter", () => {
  test("Mutual both ways, else the list's own way", () => {
    expect(fullestFilter(both)).toBe("mutual");
    expect(fullestFilter(haveOnly)).toBe("they_want");
    expect(fullestFilter(wantOnly)).toBe("they_have");
  });
});
