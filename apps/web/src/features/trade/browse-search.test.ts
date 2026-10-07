import { describe, expect, test } from "bun:test";

import { browseSearchSchema, toBrowseInput } from "./browse-search";

const artists = [{ artistMembers: [{ name: "SeoYeon" }] }];

describe("toBrowseInput", () => {
  test("scopes to the selected artists", () => {
    const input = toBrowseInput(browseSearchSchema.parse({}), artists, ["tripleS"]);
    expect(input.artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the scope", () => {
    const search = browseSearchSchema.parse({ slug: "atom01-seoyeon-204z" });
    expect(toBrowseInput(search, artists, ["tripleS"]).artist).toEqual([]);
  });

  test("an explicit artist still applies with a collection link", () => {
    const search = browseSearchSchema.parse({ slug: "atom01-seoyeon-204z", artist: "artms" });
    expect(toBrowseInput(search, artists, ["tripleS"]).artist).toEqual(["artms"]);
  });

  test("folds members onto Cosmo's spelling", () => {
    const search = browseSearchSchema.parse({ member: "seoyeon" });
    expect(toBrowseInput(search, artists, []).member).toEqual(["SeoYeon"]);
  });
});

describe("browseSearchSchema", () => {
  test("drops values that do not parse", () => {
    expect(browseSearchSchema.parse({ type: "bogus", match: "nope" })).toMatchObject({
      type: undefined,
      match: undefined,
    });
    expect(browseSearchSchema.parse({ match: "they_have" }).match).toBe("they_have");
  });
});
