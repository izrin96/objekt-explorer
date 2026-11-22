import { describe, expect, test } from "bun:test";

import {
  filterFits,
  fullestFilter,
  mutualCountInputSchema,
  peopleInputSchema,
  tradePostInputSchema,
} from "./trade";

describe("people cursor", () => {
  const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", userId: "u1", order: "a1b2c3", at: 24 };

  test("takes an order and a position, and a lead", () => {
    expect(peopleInputSchema.parse({ cursor }).cursor).toEqual(cursor);
    expect(peopleInputSchema.parse({ cursor: { ...cursor, lead: "u9" } }).cursor?.lead).toBe("u9");
  });

  test("takes the cursor as JSON, as /api/v1 sends it", () => {
    expect(peopleInputSchema.parse({ cursor: JSON.stringify(cursor) }).cursor).toEqual(cursor);
  });

  test("refuses a cursor that is not JSON, rather than starting over", () => {
    expect(peopleInputSchema.safeParse({ cursor: "{bad" }).success).toBe(false);
  });

  test("refuses a cursor without its order or position", () => {
    const { order: _, ...noOrder } = cursor;
    const { at: __, ...noAt } = cursor;
    for (const bad of [noOrder, noAt]) {
      expect(peopleInputSchema.safeParse({ cursor: bad }).success).toBe(false);
    }
  });

  test("refuses a negative or fractional position and an empty order", () => {
    for (const extra of [{ at: -1 }, { at: 1.5 }, { order: "" }, { order: "x".repeat(65) }]) {
      expect(peopleInputSchema.safeParse({ cursor: { ...cursor, ...extra } }).success).toBe(false);
    }
  });

  test("refuses a time Postgres would choke on", () => {
    for (const bumpedAt of [
      "yesterday",
      "",
      "2026-10-07 09:12:30.123456+00",
      "2026-13-40T00:00:00Z",
    ]) {
      expect(peopleInputSchema.safeParse({ cursor: { ...cursor, bumpedAt } }).success).toBe(false);
    }
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

describe("feed inputs", () => {
  test("match and Compare with are optional", () => {
    const parsed = peopleInputSchema.parse({});
    expect(parsed.match).toBeUndefined();
    expect(parsed.list).toBeUndefined();
    expect(peopleInputSchema.safeParse({ match: "sometimes" }).success).toBe(false);
    expect(mutualCountInputSchema.parse({})).toEqual({});
  });
});

describe("tradePostInputSchema", () => {
  test("a tab of the build before this one sends { postId, listId }: it parses to postId alone", () => {
    expect(tradePostInputSchema.parse({ postId: 1000123, listId: 812 })).toEqual({
      postId: 1000123,
    });
    expect(tradePostInputSchema.parse({ postId: 1000123 })).toEqual({ postId: 1000123 });
  });

  test("a tab from before post ids sends { listId } alone, which is refused", () => {
    expect(tradePostInputSchema.safeParse({ listId: 812 }).success).toBe(false);
  });

  test("refuses an input naming no post, and ids that are not positive integers", () => {
    for (const bad of [{}, { postId: 0 }, { postId: -1 }, { postId: 1.5 }]) {
      expect(tradePostInputSchema.safeParse(bad).success).toBe(false);
    }
  });
});
