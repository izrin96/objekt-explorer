import { describe, expect, test } from "bun:test";

import {
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
  const visible = { viewerShows: true, shownShows: true, blocked: false, self: false };

  test("both on, no block, someone else", () => {
    expect(showsOnlineTo(visible)).toBe(true);
  });

  test("never the viewer's own dot", () => {
    expect(showsOnlineTo({ ...visible, self: true })).toBe(false);
  });

  test("a block either way hides it", () => {
    expect(showsOnlineTo({ ...visible, blocked: true })).toBe(false);
  });

  test("the viewer off sees nobody", () => {
    expect(showsOnlineTo({ ...visible, viewerShows: false })).toBe(false);
  });

  test("the person off shows to nobody", () => {
    expect(showsOnlineTo({ ...visible, shownShows: false })).toBe(false);
  });
});

describe("presenceTargets", () => {
  const row = (id: string, shows = true, blocked = false) => ({ id, shows, blocked });

  test("asks for others with the switch on and no block", () => {
    expect(presenceTargets("me", ["a", "b"], [row("me"), row("a"), row("b")])).toEqual(["a", "b"]);
  });

  test("never the viewer, even when asked", () => {
    expect(presenceTargets("me", ["me", "a"], [row("me"), row("a")])).toEqual(["a"]);
  });

  test("the viewer off asks for nobody", () => {
    expect(presenceTargets("me", ["a"], [row("me", false), row("a")])).toEqual([]);
  });

  test("no viewer row asks for nobody", () => {
    expect(presenceTargets("me", ["a"], [row("a")])).toEqual([]);
  });

  test("drops a person off, blocked, or unknown", () => {
    const rows = [row("me"), row("off", false), row("blocked", true, true), row("a")];
    expect(presenceTargets("me", ["off", "blocked", "ghost", "a"], rows)).toEqual(["a"]);
  });
});
