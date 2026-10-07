import { describe, expect, test } from "bun:test";

import { summarizePosts } from "./my-posts-summary";

const LATER = "2026-10-09T00:00:00.000Z";
const post = (listed: boolean, bumpable: boolean) => ({
  listed,
  nextBumpAt: bumpable ? null : LATER,
});

describe("summarizePosts", () => {
  test("six posts, one idle, two ready to bump", () => {
    const posts = [
      post(true, true),
      post(true, false),
      post(true, false),
      post(true, false),
      post(true, false),
      post(false, true),
    ];
    expect(summarizePosts(posts)).toEqual({ listed: 5, idle: 1, ready: 2, shownByDefault: true });
  });

  test("nothing idle starts hidden, however many can be bumped", () => {
    expect(summarizePosts([post(true, true), post(true, true)])).toEqual({
      listed: 2,
      idle: 0,
      ready: 2,
      shownByDefault: false,
    });
  });

  test("every post idle", () => {
    expect(summarizePosts([post(false, true), post(false, true)])).toEqual({
      listed: 0,
      idle: 2,
      ready: 2,
      shownByDefault: true,
    });
  });
});
