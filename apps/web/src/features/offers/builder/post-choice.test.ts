import { describe, expect, test } from "bun:test";

import {
  buyPostsOf,
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

  describe("with a Buy post", () => {
    const withBuy = [...posts, { slug: "lookingfor", buy: true }];

    test("opens on it from the start, the matches' post and the added post", () => {
      expect(openPostOf(withBuy, { startList: "lookingfor" })).toBe("lookingfor");
      expect(openPostOf(withBuy, { matchesPost: "lookingfor" })).toBe("lookingfor");
      expect(openPostOf(withBuy, { addedPost: "lookingfor" })).toBe("lookingfor");
    });

    test("a WTB lead post is no post to ask from", () => {
      expect(openPostOf(withBuy, { lead: "lookingfor" })).toBe("doubles");
    });

    test("the first get pick's list is no way onto it", () => {
      expect(openPostOf(withBuy, { get: [{ listSlug: "lookingfor" }] })).toBe("doubles");
    });

    test("a fallback never lands on it, even listed first", () => {
      expect(openPostOf([withBuy[2]!, ...posts], {})).toBe("doubles");
    });
  });
});

describe("buyPostsOf", () => {
  test("keeps only the Buy posts, in order, typed want", () => {
    expect(
      buyPostsOf([
        { slug: "a", name: "A", buy: true },
        { slug: "hunting", name: "Hunting", buy: false },
        { slug: "b", name: "B", buy: true },
      ]),
    ).toEqual([
      { slug: "a", name: "A", type: "want", want: null, buy: true },
      { slug: "b", name: "B", type: "want", want: null, buy: true },
    ]);
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
  const wantLists = [
    { slug: "lookingfor", buy: true },
    { slug: "hunting", buy: false },
  ];

  test("a Buy post's want list from matches", () => {
    expect(startWantOf(wantLists, { matchesPost: "lookingfor" })).toBe("lookingfor");
  });

  test("the request's target alone", () => {
    expect(startWantOf(wantLists, { target: "lookingfor" })).toBe("lookingfor");
  });

  test("a want list paired with a post is no start", () => {
    expect(startWantOf(wantLists, { matchesPost: "hunting" })).toBeUndefined();
  });

  test("a slug that is no want list on Trade", () => {
    expect(startWantOf(wantLists, { target: "doubles" })).toBeUndefined();
  });

  test("an added want beats the target", () => {
    const more = [...wantLists, { slug: "other", buy: true }];
    expect(startWantOf(more, { addedWant: "other", target: "lookingfor" })).toBe("other");
  });

  test("a paired added want is no start, whatever the target", () => {
    expect(startWantOf(wantLists, { addedWant: "hunting", target: "lookingfor" })).toBeUndefined();
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
      gives: { want: "hunting", buy: false },
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
      buy: false,
    });
  });

  test("a Buy post under Offer on sends its want list, whatever You get asks", () => {
    const withBuy = [...posts, { slug: "lookingfor", want: null, buy: true }];
    const expected = {
      gives: { want: "lookingfor", buy: true },
      input: { wantList: "lookingfor" },
    };
    expect(offerOnOf({ ...base, posts: withBuy, postSlug: "lookingfor" })).toEqual(expected);
    expect(offerOnOf({ ...base, posts: withBuy, postSlug: "lookingfor", newAsk: true })).toEqual(
      expected,
    );
  });

  test("a start is ignored while there are Offer on choices", () => {
    expect(offerOnOf({ ...base, startWant: "lookingfor" })).toEqual({
      gives: { want: "hunting", buy: false },
      input: { post: "doubles" },
    });
  });

  test("a start with no posts sends its want list, and with a new ask sends nothing", () => {
    const none = { ...base, posts: [], postSlug: null, startWant: "lookingfor" };
    expect(offerOnOf(none)).toEqual({
      gives: { want: "lookingfor", buy: true },
      input: { wantList: "lookingfor" },
    });
    expect(offerOnOf({ ...none, newAsk: true })).toEqual({ gives: "every", input: {} });
  });

  test("4: a counter asking nothing new ignores a start", () => {
    expect(offerOnOf({ ...base, counter: true, startWant: "lookingfor" })).toEqual({
      gives: "every",
      input: {},
    });
  });

  test("6: no ask on a post with a want list", () => {
    expect(offerOnOf(base)).toEqual({
      gives: { want: "hunting", buy: false },
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
  const one = { want: "hunting", buy: false };

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
