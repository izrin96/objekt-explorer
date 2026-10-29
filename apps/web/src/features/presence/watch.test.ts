import { describe, expect, test } from "bun:test";

import { applyOnline, chunk, dueIds, PRESENCE_POLL_MS, unwatch, watch } from "./watch";

describe("watch and unwatch", () => {
  test("the first avatar starts a watch, later ones only count", () => {
    const watched = new Map<string, number>();
    expect(watch(watched, "u1")).toBe(true);
    expect(watch(watched, "u1")).toBe(false);
    expect(watched.get("u1")).toBe(2);
  });

  test("the last avatar to go ends the watch", () => {
    const watched = new Map<string, number>();
    watch(watched, "u1");
    watch(watched, "u1");
    expect(unwatch(watched, "u1")).toBe(false);
    expect(watched.has("u1")).toBe(true);
    expect(unwatch(watched, "u1")).toBe(true);
    expect(watched.has("u1")).toBe(false);
  });

  test("an id never watched is a no-op", () => {
    const watched = new Map<string, number>();
    expect(unwatch(watched, "u1")).toBe(false);
    expect(watched.size).toBe(0);
  });
});

describe("dueIds", () => {
  const watched = new Map([
    ["never", 1],
    ["fresh", 1],
    ["stale", 2],
  ]);
  const now = 100_000;
  const lastChecked = new Map([
    ["fresh", now - 1_000],
    ["stale", now - PRESENCE_POLL_MS],
    ["gone", now - PRESENCE_POLL_MS * 2],
  ]);

  test("ids never answered or answered a poll ago, and only watched ones", () => {
    expect(dueIds(watched, lastChecked, now)).toEqual(["never", "stale"]);
  });

  test("a zero interval makes every watched id due", () => {
    expect(dueIds(watched, lastChecked, now, 0)).toEqual(["never", "fresh", "stale"]);
  });
});

describe("chunk", () => {
  test("groups of 100 by default", () => {
    const ids = Array.from({ length: 250 }, (_, index) => `u${index}`);
    expect(chunk(ids).map((group) => group.length)).toEqual([100, 100, 50]);
  });

  test("nothing to ask is no request", () => {
    expect(chunk([])).toEqual([]);
  });
});

describe("applyOnline", () => {
  test("the answer replaces only the ids asked", () => {
    expect(applyOnline({ u1: true, u9: true }, ["u1", "u2"], ["u2"])).toEqual({
      u2: true,
      u9: true,
    });
  });

  test("an unchanged answer keeps the same object", () => {
    const online: Record<string, true> = { u1: true };
    expect(applyOnline(online, ["u1", "u2"], ["u1"])).toBe(online);
  });
});
