import { describe, expect, test } from "bun:test";

import {
  chosenPostOf,
  giveRule,
  openPostOf,
  postProblem,
  startedPostOf,
  wantPostOf,
} from "./post-choice";

const posts = [{ slug: "doubles" }, { slug: "spares" }];

describe("openPostOf", () => {
  test("the post the builder started from", () => {
    expect(openPostOf(posts, { startList: "spares", matchesPost: "doubles" })).toBe("spares");
  });

  test("else the post a row's matches came from", () => {
    expect(openPostOf(posts, { matchesPost: "spares", lead: "doubles" })).toBe("spares");
    expect(openPostOf(posts, { addedPost: "spares", lead: "doubles" })).toBe("spares");
  });

  test("else the row's lead post", () => {
    expect(openPostOf(posts, { lead: "spares" })).toBe("spares");
  });

  test("a WTB lead post is no post to ask from", () => {
    expect(openPostOf(posts, { lead: "hunting" })).toBe("doubles");
  });

  test("else the first get pick's list", () => {
    expect(openPostOf(posts, { get: [{ listSlug: null }, { listSlug: "spares" }] })).toBe("spares");
  });

  test("else their first post", () => {
    expect(openPostOf(posts, {})).toBe("doubles");
  });

  test("a partner with no posts", () => {
    expect(openPostOf([], { startList: "doubles" })).toBeUndefined();
  });
});

describe("chosenPostOf", () => {
  test("where it opened, until the sender chooses", () => {
    expect(chosenPostOf(posts, undefined, "doubles")).toBe("doubles");
  });

  test("the sender's choice", () => {
    expect(chosenPostOf(posts, "spares", "doubles")).toBe("spares");
  });

  test("No post", () => {
    expect(chosenPostOf(posts, null, "doubles")).toBeNull();
  });

  test("a chosen post taken off Trade falls back", () => {
    expect(chosenPostOf(posts, "gone", "doubles")).toBe("doubles");
  });

  test("no posts, no post", () => {
    expect(chosenPostOf([], "doubles", undefined)).toBeNull();
  });
});

describe("postProblem", () => {
  test("a pick on the post", () => {
    expect(postProblem({ listSlug: "doubles" }, true, "doubles")).toBeNull();
  });

  test("a pick on another post", () => {
    expect(postProblem({ listSlug: "spares" }, true, "doubles")).toBe("other_post");
  });

  test("any pick under No post", () => {
    expect(postProblem({ listSlug: "doubles" }, true, null)).toBe("no_post");
  });

  test("a kept objekt goes on any post", () => {
    expect(postProblem({ listSlug: null, kept: true }, true, null)).toBeNull();
    expect(postProblem({ listSlug: "spares", kept: true }, true, "doubles")).toBeNull();
  });

  test("a partner with no posts", () => {
    expect(postProblem({ listSlug: null }, false, null)).toBeNull();
  });
});

describe("giveRule", () => {
  const on = { wantedOnly: true, wantsOnTrade: true };

  test("off filters nothing", () => {
    expect(giveRule({ ...on, wantedOnly: false }, { want: "hunting" })).toBeNull();
    expect(giveRule(undefined, null)).toBeNull();
  });

  test("a post with a want list holds gives to it", () => {
    expect(giveRule(on, { want: "hunting" })).toEqual({ want: "hunting" });
  });

  test("a post without a want list takes anything", () => {
    expect(giveRule(on, { want: null })).toBeNull();
  });

  test("no post holds gives to every want list on Trade", () => {
    expect(giveRule(on, null)).toBe("all");
  });

  test("no post and no want list on Trade takes anything", () => {
    expect(giveRule({ ...on, wantsOnTrade: false }, null)).toBeNull();
  });
});

describe("startedPostOf", () => {
  test("the post the builder started from", () => {
    expect(startedPostOf(posts, { startList: "spares" })).toBe("spares");
    expect(startedPostOf(posts, { matchesPost: "doubles" })).toBe("doubles");
    expect(startedPostOf(posts, { addedPost: "spares" })).toBe("spares");
  });

  test("from chat or a row with no post, none", () => {
    expect(startedPostOf(posts, {})).toBeNull();
  });

  test("a WTB post is no post to ask from", () => {
    expect(startedPostOf(posts, { startList: "hunting" })).toBeNull();
  });
});

describe("wantPostOf", () => {
  test("asking nothing stays on the post it started from", () => {
    expect(wantPostOf("doubles", [])).toBe("doubles");
    expect(wantPostOf(null, [{ listSlug: null, kept: true }])).toBeNull();
  });

  test("every ask on the started post", () => {
    expect(wantPostOf("doubles", [{ listSlug: "doubles" }, { listSlug: "doubles" }])).toBe(
      "doubles",
    );
  });

  test("every ask on one other list moves to it", () => {
    expect(wantPostOf("doubles", [{ listSlug: "spares" }])).toBe("spares");
    expect(wantPostOf(null, [{ listSlug: "spares" }, { listSlug: "spares" }])).toBe("spares");
  });

  test("asks across posts are on none", () => {
    expect(wantPostOf("doubles", [{ listSlug: "doubles" }, { listSlug: "spares" }])).toBeNull();
  });

  test("a kept objekt doesn't count", () => {
    expect(
      wantPostOf("doubles", [{ listSlug: "spares", kept: true }, { listSlug: "doubles" }]),
    ).toBe("doubles");
  });
});
