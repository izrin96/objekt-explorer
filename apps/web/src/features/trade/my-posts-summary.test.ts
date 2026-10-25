import { describe, expect, test } from "bun:test";

import { summarizePosts } from "./my-posts-summary";

const post = (listed: boolean) => ({ listed });

describe("summarizePosts", () => {
  test("six posts, one idle", () => {
    const posts = [post(true), post(true), post(true), post(true), post(true), post(false)];
    expect(summarizePosts(posts)).toEqual({ listed: 5, idle: 1, shownByDefault: true });
  });

  test("nothing idle starts hidden", () => {
    expect(summarizePosts([post(true), post(true)])).toEqual({
      listed: 2,
      idle: 0,
      shownByDefault: false,
    });
  });

  test("every post idle", () => {
    expect(summarizePosts([post(false), post(false)])).toEqual({
      listed: 0,
      idle: 2,
      shownByDefault: true,
    });
  });
});
