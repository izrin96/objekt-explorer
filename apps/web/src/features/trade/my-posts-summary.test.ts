import { describe, expect, test } from "bun:test";

import { ownEmptyKind, summarizePosts } from "./my-posts-summary";

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

describe("ownEmptyKind", () => {
  const own = (listed: boolean, tradeBlocked = false) => ({ listed, tradeBlocked });

  test("no posts", () => {
    expect(ownEmptyKind([])).toBe("none");
  });

  test("a trade block wins over idle posts", () => {
    expect(ownEmptyKind([own(false, true), own(false, true)])).toBe("blocked");
  });

  test("a trade block wins over listed posts", () => {
    expect(ownEmptyKind([own(true, true)])).toBe("blocked");
  });

  test("every post idle", () => {
    expect(ownEmptyKind([own(false), own(false)])).toBe("idle");
  });

  test("listed but nothing left to show", () => {
    expect(ownEmptyKind([own(true), own(false)])).toBe("empty");
  });
});
