import { describe, expect, test } from "bun:test";

import { attachEarlier, type RankedNote } from "./notification-groups";

const note = (key: string, id: number, updates = 0): RankedNote<{ id: number }> => ({
  key,
  updates,
  item: { id },
});

describe("attachEarlier", () => {
  test("a trade with three read rows under its unread head", () => {
    const [row] = attachEarlier(
      [note("trade:89", 4, 3)],
      [3, 2, 1].map((id) => note("trade:89", id, 3)),
    );
    expect(row?.updates).toBe(3);
    expect(row?.earlier?.map((e) => e.item.id)).toEqual([3, 2, 1]);
  });

  test("a head alone carries neither field, and rows of other groups stay off it", () => {
    const rows = attachEarlier(
      [note("row:9", 9), note("offer:1", 2, 1)],
      [note("offer:1", 1, 1), note("trade:2", 3, 1)],
    );
    expect(rows[0]).toMatchObject({ updates: undefined, earlier: undefined });
    expect(rows[1]?.earlier?.map((e) => e.item.id)).toEqual([1]);
  });

  test("updates counts the whole group even past the rows carried", () => {
    const [row] = attachEarlier([note("trade:1", 20, 14)], [note("trade:1", 19, 14)]);
    expect(row?.updates).toBe(14);
    expect(row?.earlier).toHaveLength(1);
  });
});
