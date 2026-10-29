import { describe, expect, test } from "bun:test";

import { applyPresence, chunk, dueIds, PRESENCE_POLL_MS, unwatch, watch } from "./watch";

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

describe("applyPresence", () => {
  const empty = () => ({ online: {}, idle: {} });

  test("the answer replaces only the ids asked", () => {
    const state = {
      online: { u1: true, u9: true } as const,
      idle: { u1: true, u9: true } as const,
    };
    expect(applyPresence(state, ["u1", "u2"], { online: ["u2"], idle: [] })).toEqual({
      online: { u2: true, u9: true },
      idle: { u9: true },
    });
  });

  test("an idle id is online too", () => {
    expect(applyPresence(empty(), ["u1", "u2"], { online: ["u1", "u2"], idle: ["u2"] })).toEqual({
      online: { u1: true, u2: true },
      idle: { u2: true },
    });
  });

  test("an idle id the answer doesn't call online is dropped", () => {
    expect(applyPresence(empty(), ["u1"], { online: [], idle: ["u1"] })).toEqual(empty());
  });

  test("going offline leaves idle", () => {
    const state = { online: { u1: true } as const, idle: { u1: true } as const };
    expect(applyPresence(state, ["u1"], { online: [], idle: [] })).toEqual(empty());
  });

  test("coming back from idle stays online", () => {
    const state = { online: { u1: true } as const, idle: { u1: true } as const };
    const next = applyPresence(state, ["u1"], { online: ["u1"], idle: [] });
    expect(next).toEqual({ online: { u1: true }, idle: {} });
    expect(next.online).toBe(state.online);
  });

  test("an unchanged answer keeps the same objects", () => {
    const state = { online: { u1: true, u2: true } as const, idle: { u2: true } as const };
    const next = applyPresence(state, ["u1", "u2", "u3"], { online: ["u1", "u2"], idle: ["u2"] });
    expect(next).toBe(state);
    expect(next.online).toBe(state.online);
    expect(next.idle).toBe(state.idle);
  });
});
