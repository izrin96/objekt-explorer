import { describe, expect, test } from "bun:test";

import {
  chosenPostOf,
  giveRule,
  offerOnOf,
  openPostOf,
  postProblem,
  startWantOf,
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

  test("a want list opens the post it pairs with", () => {
    const paired = [
      { slug: "doubles", want: "hunting" },
      { slug: "spares", want: "wishlist" },
    ];
    expect(openPostOf(paired, { addedPost: "wishlist" })).toBe("spares");
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

  test("a kept objekt goes on any post", () => {
    expect(postProblem({ listSlug: null, kept: true }, true, "doubles")).toBeNull();
    expect(postProblem({ listSlug: "spares", kept: true }, true, "doubles")).toBeNull();
  });

  test("a partner with no posts", () => {
    expect(postProblem({ listSlug: null }, false, null)).toBeNull();
  });
});

describe("startWantOf", () => {
  const wantLists = [{ slug: "lookingfor" }, { slug: "hunting" }];
  const paired = [{ want: "hunting" }];

  test("a Buy post's want list from matches", () => {
    expect(startWantOf(paired, wantLists, { matchesPost: "lookingfor" })).toBe("lookingfor");
  });

  test("the request's target alone", () => {
    expect(startWantOf(paired, wantLists, { target: "lookingfor" })).toBe("lookingfor");
  });

  test("a want list paired with a post is no start", () => {
    expect(startWantOf(paired, wantLists, { matchesPost: "hunting" })).toBeUndefined();
  });

  test("a slug that is no want list on Trade", () => {
    expect(startWantOf(paired, wantLists, { target: "doubles" })).toBeUndefined();
  });

  test("an added want beats the target", () => {
    const more = [...wantLists, { slug: "other" }];
    expect(startWantOf(paired, more, { addedWant: "other", target: "lookingfor" })).toBe("other");
  });

  test("a paired added want is no start, whatever the target", () => {
    expect(
      startWantOf(paired, wantLists, { addedWant: "hunting", target: "lookingfor" }),
    ).toBeUndefined();
  });
});

describe("offerOnOf", () => {
  const posts = [
    { slug: "doubles", want: "hunting" },
    { slug: "extras", want: null },
  ];
  const base = { postSlug: "doubles", posts, startWant: undefined, newAsk: false, counter: false };

  test("1: a new ask with no posts", () => {
    expect(offerOnOf({ ...base, posts: [], postSlug: null, newAsk: true })).toEqual({
      gives: "every",
      input: {},
    });
  });

  test("2: a new ask on a post with a want list", () => {
    expect(offerOnOf({ ...base, newAsk: true })).toEqual({
      gives: { want: "hunting", start: false },
      input: { post: "doubles" },
    });
  });

  test("3: a new ask on a post without one", () => {
    expect(offerOnOf({ ...base, postSlug: "extras", newAsk: true })).toEqual({
      gives: "none",
      input: { post: "extras" },
    });
  });

  test("a start is ignored once You get asks", () => {
    expect(offerOnOf({ ...base, newAsk: true, startWant: "lookingfor" }).gives).toEqual({
      want: "hunting",
      start: false,
    });
  });

  test("4: a counter asking nothing new ignores a start", () => {
    expect(offerOnOf({ ...base, counter: true, startWant: "lookingfor" })).toEqual({
      gives: "every",
      input: {},
    });
  });

  test("5: a start", () => {
    expect(offerOnOf({ ...base, startWant: "lookingfor" })).toEqual({
      gives: { want: "lookingfor", start: true },
      input: { wantList: "lookingfor" },
    });
  });

  test("6: no ask on a post with a want list", () => {
    expect(offerOnOf(base)).toEqual({
      gives: { want: "hunting", start: false },
      input: { post: "doubles" },
    });
  });

  test("7: no ask on a post without one", () => {
    expect(offerOnOf({ ...base, postSlug: "extras" })).toEqual({
      gives: "none",
      input: { post: "extras" },
    });
  });

  test("8: no ask and no posts", () => {
    expect(offerOnOf({ ...base, posts: [], postSlug: null })).toEqual({
      gives: "every",
      input: {},
    });
  });
});

describe("giveRule", () => {
  const on = { wantedOnly: true, wantsOnTrade: true };
  const one = { want: "hunting", start: false };

  test("off filters nothing", () => {
    expect(giveRule({ ...on, wantedOnly: false }, one)).toBeNull();
    expect(giveRule(undefined, "every")).toBeNull();
    expect(giveRule({ ...on, wantedOnly: false }, "none")).toBeNull();
  });

  test("one want list holds gives to it", () => {
    expect(giveRule(on, one)).toEqual({ want: "hunting" });
  });

  test("a post without a want list takes no objekts", () => {
    expect(giveRule(on, "none")).toBe("none");
  });

  test("every want list on Trade", () => {
    expect(giveRule(on, "every")).toBe("all");
  });

  test("every want list with none on Trade filters nothing", () => {
    expect(giveRule({ ...on, wantsOnTrade: false }, "every")).toBeNull();
  });
});
