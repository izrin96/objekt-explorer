import { describe, expect, test } from "bun:test";

import {
  activeKey,
  IDLE_AFTER_SECONDS,
  idleFrom,
  onlineFromReplies,
  presenceStatsRequest,
  presenceTargets,
  showsOnlineTo,
} from "./presence";

// replies as a local Centrifugo v6 answered /api/batch
const online = { presence_stats: { num_clients: 1, num_users: 1 } };
const offline = { presence_stats: { num_clients: 0, num_users: 0 } };
const notAvailable = { error: { code: 108, message: "not available" } };

describe("presenceStatsRequest", () => {
  test("one presence_stats per user channel, in order", () => {
    expect(presenceStatsRequest(["u1", "u2"])).toEqual({
      path: "/api/batch",
      body: {
        commands: [
          { presence_stats: { channel: "user:#u1" } },
          { presence_stats: { channel: "user:#u2" } },
        ],
        parallel: true,
      },
    });
  });
});

describe("onlineFromReplies", () => {
  test("reads replies in the order the ids were asked", () => {
    expect(onlineFromReplies(["u1", "u2", "u3"], { replies: [offline, online, online] })).toEqual([
      "u2",
      "u3",
    ]);
  });

  test("an error reply is offline", () => {
    expect(onlineFromReplies(["u1", "u2"], { replies: [notAvailable, online] })).toEqual(["u2"]);
  });

  test("a short replies array leaves the rest offline", () => {
    expect(onlineFromReplies(["u1", "u2"], { replies: [online] })).toEqual(["u1"]);
  });

  test("a malformed body is nobody online", () => {
    expect(onlineFromReplies(["u1"], null)).toEqual([]);
    expect(onlineFromReplies(["u1"], "oops")).toEqual([]);
    expect(onlineFromReplies(["u1"], { error: { code: 101 } })).toEqual([]);
    expect(onlineFromReplies(["u1"], { replies: "nope" })).toEqual([]);
    expect(
      onlineFromReplies(["u1", "u2"], {
        replies: [{ presence_stats: { num_clients: "1" } }, null],
      }),
    ).toEqual([]);
  });
});

describe("showsOnlineTo", () => {
  const visible = { shownShows: true, blocked: false, self: false };

  test("switch on, no block, someone else", () => {
    expect(showsOnlineTo(visible)).toBe(true);
  });

  test("never the viewer's own dot", () => {
    expect(showsOnlineTo({ ...visible, self: true })).toBe(false);
  });

  test("a block either way hides it", () => {
    expect(showsOnlineTo({ ...visible, blocked: true })).toBe(false);
  });

  test("the person off shows to nobody", () => {
    expect(showsOnlineTo({ ...visible, shownShows: false })).toBe(false);
  });
});

describe("presenceTargets", () => {
  const row = (id: string, shows = true, blocked = false) => ({ id, shows, blocked });

  test("asks for others with the switch on and no block", () => {
    expect(presenceTargets("me", ["a", "b"], [row("a"), row("b")])).toEqual(["a", "b"]);
  });

  test("never the viewer, even when asked", () => {
    expect(presenceTargets("me", ["me", "a"], [row("me"), row("a")])).toEqual(["a"]);
  });

  test("the viewer's own switch off still sees others", () => {
    expect(presenceTargets("me", ["a"], [row("me", false), row("a")])).toEqual(["a"]);
  });

  test("drops a person off, blocked, or unknown", () => {
    const rows = [row("off", false), row("blocked", true, true), row("a")];
    expect(presenceTargets("me", ["off", "blocked", "ghost", "a"], rows)).toEqual(["a"]);
  });
});

describe("activeKey", () => {
  test("one key per user under the presence prefix", () => {
    expect(activeKey("u1")).toBe("presence:active:u1");
  });
});

describe("idleFrom", () => {
  const now = 10_000_000;
  const fresh = String(now - 1000);
  const stale = String(now - IDLE_AFTER_SECONDS * 1000);

  test("activity within the last 10 minutes is not idle", () => {
    expect(idleFrom(["a", "b"], [fresh, String(now - IDLE_AFTER_SECONDS * 1000 + 1)], now)).toEqual(
      [],
    );
  });

  test("activity 10 minutes or more ago is idle", () => {
    expect(idleFrom(["a", "b"], [stale, String(now - 3_600_000)], now)).toEqual(["a", "b"]);
  });

  test("a missing mark is not idle, so a tab from before the reporter shows online", () => {
    expect(idleFrom(["a", "b", "c"], [null, stale, fresh], now)).toEqual(["b"]);
  });

  test("an unparseable mark is not idle", () => {
    expect(idleFrom(["a"], ["x"], now)).toEqual([]);
  });

  test("unreadable marks fail toward online", () => {
    expect(idleFrom(["a", "b"], null, now)).toEqual([]);
  });

  test("keeps the order the online ids came in", () => {
    expect(idleFrom(["c", "a", "b"], [stale, fresh, stale], now)).toEqual(["c", "b"]);
  });
});
