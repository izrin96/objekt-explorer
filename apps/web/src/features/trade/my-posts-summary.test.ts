import { describe, expect, test } from "bun:test";

import { readyState, summarizePosts } from "./my-posts-summary";

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

describe("readyState", () => {
  test("all eight bumpable, one of them idle, reads all", () => {
    const posts = [...Array.from({ length: 7 }, () => post(true, true)), post(false, true)];
    expect(readyState(posts)).toBe("all");
    expect(summarizePosts(posts)).toEqual({ listed: 7, idle: 1, ready: 8, shownByDefault: true });
  });

  test("some bumpable reads a number", () => {
    expect(readyState([post(true, true), post(true, false)])).toBe("some");
  });

  test("none bumpable reads nothing", () => {
    expect(readyState([post(true, false), post(true, false), post(true, false)])).toBe("none");
  });

  test("no posts read nothing", () => {
    expect(readyState([])).toBe("none");
  });
});
