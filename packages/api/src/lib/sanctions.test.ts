import { describe, expect, test } from "bun:test";

import {
  effectiveSanction,
  type ExcerptSource,
  reportRetryAt,
  sanctionEnd,
  shapeExcerpt,
} from "./sanctions";

const NOW = new Date("2026-10-07T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe("ladder", () => {
  test("a 7-day mute ends after 7 days", () => {
    expect(sanctionEnd("chat_mute", 7, NOW)).toEqual(new Date(NOW.getTime() + 7 * DAY));
  });

  test("a ban without days and a trade block never end on their own", () => {
    expect(sanctionEnd("ban", undefined, NOW)).toBeNull();
    expect(sanctionEnd("ban", 30, NOW)).toEqual(new Date(NOW.getTime() + 30 * DAY));
    expect(sanctionEnd("trade_block", undefined, NOW)).toBeNull();
    expect(sanctionEnd("warn", undefined, NOW)).toBeNull();
  });
});

describe("reportRetryAt", () => {
  test("one report per account per 24 hours", () => {
    expect(reportRetryAt(null, NOW)).toBeNull();
    expect(reportRetryAt(at(-2 * 60 * 60 * 1000), NOW)).toEqual(
      new Date(NOW.getTime() + 22 * 60 * 60 * 1000),
    );
    expect(reportRetryAt(at(-DAY - 1), NOW)).toBeNull();
  });
});

describe("shapeExcerpt", () => {
  const messages: ExcerptSource[] = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    senderId: i % 2 === 0 ? "spam" : "kaede",
    body: `m${i + 1}`,
    card: null,
    createdAt: at(i * 1000),
  }));

  test("the latest 20, oldest first, marked by side", () => {
    const excerpt = shapeExcerpt(messages.toReversed(), "spam");
    expect(excerpt).toHaveLength(20);
    expect(excerpt[0]!.body).toBe("m6");
    expect(excerpt.at(-1)!.body).toBe("m25");
    expect(excerpt.at(-1)!.fromTarget).toBe(true);
    expect(excerpt[0]!.fromTarget).toBe(false);
  });

  test("keeps no ids or sender ids", () => {
    expect(Object.keys(shapeExcerpt(messages, "spam")[0]!).toSorted()).toEqual([
      "at",
      "body",
      "card",
      "fromTarget",
    ]);
  });
});

describe("effectiveSanction", () => {
  const ban = (reason: string, expiresAt: string | null) => ({ reason, expiresAt });

  test("none active lifts it", () => {
    expect(effectiveSanction([])).toBeNull();
  });

  test("a permanent ban outlasts a later 7-day one", () => {
    expect(effectiveSanction([ban("forever", null), ban("week", at(7 * DAY))])).toEqual({
      reason: "forever",
      until: null,
    });
  });

  test("revoking one of two bans leaves the other in force", () => {
    const both = [ban("a", at(DAY)), ban("b", at(30 * DAY))];
    expect(effectiveSanction(both)).toEqual({ reason: "b", until: at(30 * DAY) });
    expect(effectiveSanction(both.slice(0, 1))).toEqual({ reason: "a", until: at(DAY) });
  });

  test("the mute that ends last is the one shown", () => {
    expect(effectiveSanction([ban("a", at(DAY)), ban("b", at(7 * DAY))])).toEqual({
      reason: "b",
      until: at(7 * DAY),
    });
  });
});
