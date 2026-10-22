import { describe, expect, test } from "bun:test";

import {
  browseInputSchema,
  filterFits,
  forYouInputSchema,
  fullestFilter,
  listMatchCountInputSchema,
  mutualCountInputSchema,
  peopleInputSchema,
  personInputSchema,
  tabCountsInputSchema,
} from "./trade";

describe("browse cursor", () => {
  test("an older tab's cursors parse to the same data", () => {
    const bump = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };
    const mutual = { ...bump, rank: { mutual: 2, sum: 5, at: 1760000000000, userId: "u1" } };
    for (const cursor of [bump, mutual]) {
      const parsed = browseInputSchema.parse({ cursor }).cursor;
      expect(parsed).toEqual(cursor);
      expect(parsed?.phase).toBeUndefined();
      expect(parsed?.oneWay).toBeUndefined();
    }
  });

  test("takes a phase and a One way rank", () => {
    const cursor = {
      bumpedAt: "2026-10-07T09:12:30.123Z",
      id: 12,
      phase: "oneWay" as const,
      oneWay: { sum: 7, at: 1760000000000, userId: "u1" },
      scope: "0a1b2c3d4e5f",
    };
    expect(browseInputSchema.parse({ cursor }).cursor).toEqual(cursor);
  });

  test("refuses a phase it does not know and a One way rank without its person", () => {
    const base = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };
    expect(browseInputSchema.safeParse({ cursor: { ...base, phase: "later" } }).success).toBe(
      false,
    );
    expect(
      browseInputSchema.safeParse({ cursor: { ...base, oneWay: { sum: 1, at: 0 } } }).success,
    ).toBe(false);
  });

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

describe("people cursor", () => {
  test("an open tab's cursor, with no order or position, parses to the same data", () => {
    const cursor = {
      bumpedAt: "2026-10-07T09:12:30.123Z",
      userId: "u1",
      phase: "oneWay" as const,
      oneWay: { sum: 7, at: 1760000000000, userId: "u1" },
      scope: "0a1b2c3d4e5f",
      lead: "u9",
    };
    const parsed = peopleInputSchema.parse({ cursor }).cursor;
    expect(parsed).toEqual(cursor);
    expect(parsed?.order).toBeUndefined();
    expect(parsed?.at).toBeUndefined();
  });

  test("takes an order and a position", () => {
    const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", userId: "u1", order: "a1b2c3", at: 24 };
    expect(peopleInputSchema.parse({ cursor }).cursor).toEqual(cursor);
  });

  test("refuses a negative or fractional position and an empty order", () => {
    const base = { bumpedAt: "2026-10-07T09:12:30.123Z", userId: "u1" };
    for (const extra of [{ at: -1 }, { at: 1.5 }, { order: "" }, { order: "x".repeat(65) }]) {
      expect(peopleInputSchema.safeParse({ cursor: { ...base, ...extra } }).success).toBe(false);
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

describe("inputs an open tab still sends", () => {
  test("browse with Only matches on, or without it", () => {
    const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12 };
    const on = browseInputSchema.parse({
      type: "wtt",
      slug: "atom01-seoyeon-204z",
      matches: true,
      cursor,
    });
    expect(on.matches).toBe(true);
    expect(on.match).toBeUndefined();
    expect(on.list).toBeUndefined();
    expect(on.cursor).toEqual(cursor);
    expect(browseInputSchema.parse({}).matches).toBeUndefined();
  });

  test("the unchanged procedures' inputs", () => {
    expect(forYouInputSchema.parse({}).filter).toBe("all");
    expect(forYouInputSchema.parse({ filter: "mutual", list: "spares" }).list).toBe("spares");
    expect(tabCountsInputSchema.parse({})).toEqual({ forYou: true });
    expect(tabCountsInputSchema.parse({ forYou: false })).toEqual({ forYou: false });
    expect(listMatchCountInputSchema.parse({ slug: "spares" })).toEqual({ slug: "spares" });
  });

  test("the new fields are optional", () => {
    const rank = { mutual: 2, sum: 5, at: 1760000000000, userId: "u1" };
    const cursor = { bumpedAt: "2026-10-07T09:12:30.123Z", id: 12, rank };
    expect(
      browseInputSchema.parse({ match: "mutual", list: "spares", cursor }).cursor?.rank,
    ).toEqual(rank);
    expect(browseInputSchema.safeParse({ match: "sometimes" }).success).toBe(false);
    expect(personInputSchema.parse({ userId: "u1" }).list).toBeUndefined();
    expect(mutualCountInputSchema.parse({})).toEqual({});
  });
});
