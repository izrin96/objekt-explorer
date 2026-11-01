import { describe, expect, test } from "bun:test";

import {
  browseRedirect,
  browseSearchSchema,
  canMatchOf,
  forYouFallback,
  forYouNormalise,
  forYouSearchSchema,
  matchModeOf,
  oldPersonLink,
  postTypeOf,
  toBrowseInput,
} from "./browse-search";
import { tradeListsOf } from "./compare-rule";

const artists = [{ artistMembers: [{ name: "SeoYeon" }] }];

const lists = tradeListsOf([
  {
    id: 1,
    slug: "spares",
    name: "Spares",
    listType: "have",
    isProfileBind: true,
    linkedList: { id: 2 },
  },
  {
    id: 2,
    slug: "binary-hunt",
    name: "Binary hunt",
    listType: "want",
    isProfileBind: false,
    linkedList: { id: 1 },
  },
  { id: 3, slug: "lone-want", name: "Lone want", listType: "want", isProfileBind: false },
]);

const parse = (input: Record<string, unknown>) => browseSearchSchema.parse(input);

describe("toBrowseInput", () => {
  test("scopes to the selected artists", () => {
    const input = toBrowseInput(parse({}), artists, ["tripleS"], "forYou", lists);
    expect(input.artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the scope", () => {
    const search = parse({ slug: "atom01-seoyeon-204z" });
    expect(toBrowseInput(search, artists, ["tripleS"], "forYou", lists).artist).toEqual([]);
  });

  test("an artist inside the selection narrows it", () => {
    const search = parse({ artist: "artms" });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], "forYou", lists).artist).toEqual([
      "artms",
    ]);
  });

  test("an artist outside the selection is dropped", () => {
    const search = parse({ artist: ["artms", "idntt"] });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], "forYou", lists).artist).toEqual([
      "artms",
    ]);
    const only = parse({ artist: "idntt" });
    expect(toBrowseInput(only, artists, ["tripleS"], "forYou", lists).artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the artist parameter too", () => {
    const search = parse({ slug: "atom01-seoyeon-204z", artist: "artms" });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], "forYou", lists).artist).toEqual(
      [],
    );
  });

  test("a person page's read ignores the artist selection", () => {
    const search = parse({ person: "user-1" });
    expect(toBrowseInput(search, artists, ["tripleS"], "browse", lists).artist).toEqual([]);
  });

  test("a person read keeps an artist it names, even outside the selection", () => {
    const search = parse({ person: "user-1", artist: "idntt" });
    expect(toBrowseInput(search, artists, ["tripleS"], "forYou", lists).artist).toEqual(["idntt"]);
  });

  test("without a person the selection still scopes", () => {
    const search = parse({ artist: "idntt" });
    expect(toBrowseInput(search, artists, ["tripleS"], "browse", lists).artist).toEqual([
      "tripleS",
    ]);
  });

  test("sends the mode and Compare with, and no longer sends matches", () => {
    const input = toBrowseInput(
      parse({ match: "mutual", list: "spares" }),
      artists,
      [],
      "forYou",
      lists,
    );
    expect(input).toMatchObject({ match: "mutual", list: "spares" });
    expect(input).not.toHaveProperty("matches");
  });

  test("the Post type never drops a list, Mutual drops a one-way one", () => {
    const send = (input: Record<string, unknown>) =>
      toBrowseInput(parse(input), artists, [], "forYou", lists).list;
    expect(send({ type: "wtb", list: "lone-want" })).toBe("lone-want");
    expect(send({ type: "wts", list: "spares" })).toBe("spares");
    expect(send({ match: "mutual", list: "lone-want" })).toBeUndefined();
    expect(send({ match: "mutual", list: "spares" })).toBe("spares");
  });

  test("a list that is not the viewer's is not sent", () => {
    expect(
      toBrowseInput(parse({ list: "other" }), artists, [], "forYou", lists).list,
    ).toBeUndefined();
  });

  test("Browse is always Off, and drops Compare with", () => {
    const input = toBrowseInput(
      parse({ match: "mutual", list: "spares" }),
      artists,
      [],
      "browse",
      lists,
    );
    expect(input).toMatchObject({ match: "off", list: undefined });
  });

  test("For you defaults to Any", () => {
    expect(toBrowseInput(parse({}), artists, [], "forYou", lists).match).toBe("any");
  });

  test("folds members onto Cosmo's spelling", () => {
    const search = parse({ member: "seoyeon" });
    expect(toBrowseInput(search, artists, [], "forYou", lists).member).toEqual(["SeoYeon"]);
  });
});

describe("matchModeOf", () => {
  test("Any unless the URL says Mutual", () => {
    expect(matchModeOf({})).toBe("any");
    expect(matchModeOf({ match: "mutual" })).toBe("mutual");
    expect(matchModeOf({ match: "they_have" })).toBe("any");
    expect(matchModeOf({ match: "off" })).toBe("any");
  });
});

describe("canMatchOf", () => {
  test("a want list, or a bound have or sale list", () => {
    expect(canMatchOf([{ listType: "want", isProfileBind: false }])).toBe(true);
    expect(canMatchOf([{ listType: "have", isProfileBind: true }])).toBe(true);
    expect(canMatchOf([{ listType: "have", isProfileBind: false }])).toBe(false);
    expect(canMatchOf([{ listType: "general", isProfileBind: true }])).toBe(false);
  });
});

describe("browseSearchSchema", () => {
  test("drops values that do not parse", () => {
    expect(parse({ type: "bogus" })).toMatchObject({ type: undefined });
    expect(parse({ matches: 2 })).toMatchObject({ matches: undefined });
    expect(parse({ matches: "yes" })).toMatchObject({ matches: undefined });
    expect(parse({ match: "they_have" })).toMatchObject({ match: undefined });
    expect(parse({ match: "mutual", person: "u1" })).toMatchObject({
      match: "mutual",
      person: "u1",
    });
  });
});

describe("browseRedirect", () => {
  const go = (input: Record<string, unknown>) => browseRedirect(parse(input));

  test("Old Browse link: match=mutual goes to For you with list and filters", () => {
    expect(go({ match: "mutual", list: "spares", member: "SeoYeon" })).toEqual({
      to: "/trade/for-you",
      search: { match: "mutual", list: "spares", member: ["SeoYeon"] },
    });
  });

  test("never carries person, which redirects to the person page first", () => {
    expect(go({ match: "mutual", person: "u1" })).toEqual({
      to: "/trade/for-you",
      search: { match: "mutual" },
    });
  });

  test("match=any goes to For you", () => {
    expect(go({ match: "any" })).toMatchObject({ to: "/trade/for-you", search: { match: "any" } });
  });

  test("Old Only matches link: matches=1 becomes match=any", () => {
    expect(go({ matches: "1" })).toMatchObject({ to: "/trade/for-you", search: { match: "any" } });
    expect(go({ matches: 1, list: "spares" })).toMatchObject({
      to: "/trade/for-you",
      search: { match: "any", list: "spares" },
    });
  });

  test("Old Off link drops match and list and stays on Browse", () => {
    const target = go({ match: "off", list: "spares", type: "wts" });
    expect(target).toEqual({ to: "/trade", search: { type: "wts" } });
  });

  test("match wins over matches", () => {
    expect(go({ matches: "1", match: "off" })?.to).toBe("/trade");
    expect(go({ matches: "1", match: "mutual" })).toMatchObject({
      search: { match: "mutual" },
    });
  });

  test("a stray list is dropped", () => {
    expect(go({ list: "spares", slug: "atom01-seoyeon-204z" })).toEqual({
      to: "/trade",
      search: { slug: "atom01-seoyeon-204z" },
    });
  });

  test("a clean Browse link, or one with an unparsable match, stays", () => {
    expect(go({})).toBeNull();
    expect(go({ type: "wtb" })).toBeNull();
    expect(go({ match: "they_have" })).toBeNull();
  });
});

describe("forYouNormalise", () => {
  const norm = (input: Record<string, unknown>) => forYouNormalise(forYouSearchSchema.parse(input));

  test("One-way view: they_* become Any and the list is kept", () => {
    expect(norm({ match: "they_want", list: "spares" })).toMatchObject({
      match: "any",
      list: "spares",
    });
    expect(norm({ match: "they_have" })).toMatchObject({ match: "any" });
  });

  test("never carries person or partner, which redirect to the person page first", () => {
    expect(norm({ match: "they_have", partner: "u1", person: "u2" })).toEqual({ match: "any" });
  });

  test("a current link, an empty one and an unparsable match need nothing", () => {
    expect(norm({})).toBeNull();
    expect(norm({ match: "any", list: "spares" })).toBeNull();
    expect(norm({ match: "mutual" })).toBeNull();
    expect(norm({ match: "bogus" })).toBeNull();
  });
});

describe("forYouFallback", () => {
  test("keeps the filters, and drops matching state and any person", () => {
    const search = forYouSearchSchema.parse({
      match: "mutual",
      list: "spares",
      person: "u1",
      member: "SeoYeon",
      type: "wts",
    });
    expect(forYouFallback(search)).toEqual({ member: ["SeoYeon"], type: "wts" });
    expect(forYouFallback(forYouSearchSchema.parse({ partner: "u2" }))).toEqual({});
  });
});

describe("oldPersonLink", () => {
  test("person, else partner, and the search without either", () => {
    const browse = parse({ person: "u1", type: "wtt" });
    expect(oldPersonLink(browse)).toEqual({ id: "u1", rest: { type: "wtt" } });
    const forYou = forYouSearchSchema.parse({ match: "mutual", partner: "u2", person: "u3" });
    expect(oldPersonLink(forYou)).toEqual({ id: "u3", rest: { match: "mutual" } });
    expect(oldPersonLink(forYouSearchSchema.parse({ partner: "u2" }))?.id).toBe("u2");
  });

  test("no person, nothing to follow", () => {
    expect(oldPersonLink(parse({ type: "wts" }))).toBeNull();
  });
});

describe("postTypeOf", () => {
  test("Browse and Any keep every type", () => {
    expect(postTypeOf({ type: "wts" }, "browse")).toBe("wts");
    expect(postTypeOf({ type: "wtb", match: "any" }, "forYou")).toBe("wtb");
  });

  test("Mutual lists WTT posts only, whatever the type", () => {
    expect(postTypeOf({ match: "mutual" }, "forYou")).toBe("wtt");
    expect(postTypeOf({ type: "wtb", match: "mutual" }, "forYou")).toBe("wtt");
    expect(postTypeOf({ type: "wts", match: "mutual" }, "forYou")).toBe("wtt");
  });

  test("Mutual on Browse never applies", () => {
    expect(postTypeOf({ type: "wts", match: "mutual" }, "browse")).toBe("wts");
  });
});
