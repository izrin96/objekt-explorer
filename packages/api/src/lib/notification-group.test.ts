import { describe, expect, test } from "bun:test";

import type { AlertMatch } from "../schemas/notification";
import { groupKey, mergePayload } from "./notification-group";

const list = { id: 7, slug: "abc123def", name: "Binary hunt" };
const match = (n: number): AlertMatch => ({
  collectionSlug: `seoyeon-${n}`,
  partnerName: `seller${n}`,
  sourceListSlug: `list${n}`,
});

describe("groupKey", () => {
  test("uses the UTC day", () => {
    expect(groupKey("want_match", 7, new Date("2026-10-06T23:59:59-05:00"))).toBe(
      "want_match:7:2026-10-07",
    );
    expect(groupKey("have_wanted", 12, new Date("2026-10-06T00:00:00Z"))).toBe(
      "have_wanted:12:2026-10-06",
    );
  });
});

describe("mergePayload", () => {
  test("starts a new payload", () => {
    expect(mergePayload(null, list, [match(1)])).toEqual({ list, count: 1, latest: [match(1)] });
  });

  test("increments the count and keeps the newest three", () => {
    const first = mergePayload(null, list, [match(2), match(1)]);
    const merged = mergePayload(first, list, [match(4), match(3)]);
    expect(merged.count).toBe(4);
    expect(merged.latest).toEqual([match(4), match(3), match(2)]);
  });

  test("caps a large batch at three", () => {
    const merged = mergePayload(null, list, [1, 2, 3, 4, 5].map(match));
    expect(merged.count).toBe(5);
    expect(merged.latest).toHaveLength(3);
  });

  test("takes the list's current name", () => {
    const first = mergePayload(null, list, [match(1)]);
    const renamed = { ...list, name: "Renamed" };
    expect(mergePayload(first, renamed, [match(2)]).list).toEqual(renamed);
  });
});
