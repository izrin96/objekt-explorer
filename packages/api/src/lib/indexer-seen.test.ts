import { describe, expect, test } from "bun:test";

import { INDEXER_BEHIND_MS, isBehind, parseIndexerSeen } from "./indexer-seen";

describe("isBehind", () => {
  const now = Date.parse("2026-10-08T16:00:00.000Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  test("a fresh reading of a current head is not behind", () => {
    expect(isBehind({ seenUntil: ago(10_000), readAt: ago(30_000) }, now)).toBe(false);
  });

  test("a head older than the limit is behind", () => {
    expect(isBehind({ seenUntil: ago(INDEXER_BEHIND_MS + 1), readAt: ago(0) }, now)).toBe(true);
  });

  test("a reading older than the limit is behind, however current its head was", () => {
    expect(isBehind({ seenUntil: ago(0), readAt: ago(INDEXER_BEHIND_MS + 1) }, now)).toBe(true);
  });

  test("a missing or unreadable reading is behind", () => {
    expect(isBehind(null, now)).toBe(true);
    expect(isBehind({ seenUntil: "nonsense", readAt: ago(0) }, now)).toBe(true);
  });
});

describe("parseIndexerSeen", () => {
  test("reads a stored value", () => {
    const value = { seenUntil: "2026-10-08T16:00:00.000Z", readAt: "2026-10-08T16:00:05.000Z" };
    expect(parseIndexerSeen(JSON.stringify(value))).toEqual(value);
  });

  test("rejects missing and malformed values", () => {
    expect(parseIndexerSeen(null)).toBeNull();
    expect(parseIndexerSeen("not json")).toBeNull();
    expect(parseIndexerSeen(JSON.stringify({ seenUntil: 1 }))).toBeNull();
  });
});
