import { describe, expect, test } from "bun:test";

import {
  browseSearchSchema,
  canMatchOf,
  forYouSearchSchema,
  forYouToBrowse,
  matchModeOf,
  toBrowseInput,
} from "./browse-search";

const artists = [{ artistMembers: [{ name: "SeoYeon" }] }];

const parse = (input: Record<string, unknown>) => browseSearchSchema.parse(input);

describe("toBrowseInput", () => {
  test("scopes to the selected artists", () => {
    const input = toBrowseInput(parse({}), artists, ["tripleS"], true);
    expect(input.artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the scope", () => {
    const search = parse({ slug: "atom01-seoyeon-204z" });
    expect(toBrowseInput(search, artists, ["tripleS"], true).artist).toEqual([]);
  });

  test("an artist inside the selection narrows it", () => {
    const search = parse({ artist: "artms" });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], true).artist).toEqual(["artms"]);
  });

  test("an artist outside the selection is dropped", () => {
    const search = parse({ artist: ["artms", "idntt"] });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], true).artist).toEqual(["artms"]);
    const only = parse({ artist: "idntt" });
    expect(toBrowseInput(only, artists, ["tripleS"], true).artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the artist parameter too", () => {
    const search = parse({ slug: "atom01-seoyeon-204z", artist: "artms" });
    expect(toBrowseInput(search, artists, ["tripleS", "artms"], true).artist).toEqual([]);
  });

  test("sends the mode and Compare with, and no longer sends matches", () => {
    const input = toBrowseInput(parse({ match: "mutual", list: "spares" }), artists, [], true);
    expect(input).toMatchObject({ match: "mutual", list: "spares" });
    expect(input).not.toHaveProperty("matches");
  });

  test("list is dropped under Off", () => {
    const input = toBrowseInput(parse({ match: "off", list: "spares" }), artists, [], true);
    expect(input).toMatchObject({ match: "off", list: undefined });
  });

  test("folds members onto Cosmo's spelling", () => {
    const search = parse({ member: "seoyeon" });
    expect(toBrowseInput(search, artists, [], true).member).toEqual(["SeoYeon"]);
  });
});

describe("matchModeOf", () => {
  test("the default is Any", () => {
    expect(matchModeOf(parse({}), true)).toBe("any");
  });

  test("a slug link defaults to Off, unless it says otherwise", () => {
    expect(matchModeOf(parse({ slug: "atom01-seoyeon-204z" }), true)).toBe("off");
    expect(matchModeOf(parse({ slug: "atom01-seoyeon-204z", match: "any" }), true)).toBe("any");
  });

  test("an old matches=1 reads as Any, and match wins", () => {
    for (const matches of ["1", 1]) {
      expect(matchModeOf(parse({ matches, slug: "atom01-seoyeon-204z" }), true)).toBe("any");
    }
    expect(matchModeOf(parse({ matches: "1", match: "off" }), true)).toBe("off");
  });

  test("without a list that can match it is Off", () => {
    expect(matchModeOf(parse({ match: "mutual" }), false)).toBe("off");
    expect(matchModeOf(parse({ matches: "1" }), false)).toBe("off");
  });

  test("a value that does not parse is ignored", () => {
    expect(matchModeOf(parse({ match: "they_have" }), true)).toBe("any");
    expect(matchModeOf(parse({ match: "they_have", slug: "x" }), true)).toBe("off");
  });
});

describe("canMatchOf", () => {
  test("a want list, or a bound have or sale list", () => {
    expect(canMatchOf([{ listTypeNew: "want", isProfileBind: false }])).toBe(true);
    expect(canMatchOf([{ listTypeNew: "have", isProfileBind: true }])).toBe(true);
    expect(canMatchOf([{ listTypeNew: "have", isProfileBind: false }])).toBe(false);
    expect(canMatchOf([{ listTypeNew: "general", isProfileBind: true }])).toBe(false);
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

describe("forYouToBrowse", () => {
  const map = (input: Record<string, unknown>) => forYouToBrowse(forYouSearchSchema.parse(input));

  test("mutual stays Mutual and everything else becomes Any", () => {
    expect(map({ match: "mutual" }).match).toBe("mutual");
    expect(map({ match: "they_have" }).match).toBe("any");
    expect(map({ match: "they_want" }).match).toBe("any");
    expect(map({}).match).toBe("any");
    expect(map({ match: "bogus" }).match).toBe("any");
  });

  test("list is kept and partner becomes person", () => {
    expect(map({ list: "spares", partner: "u1" })).toEqual({
      match: "any",
      list: "spares",
      person: "u1",
    });
  });
});
