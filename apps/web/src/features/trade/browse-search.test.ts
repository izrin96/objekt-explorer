import { describe, expect, test } from "bun:test";

import { browseSearchSchema, toBrowseInput } from "./browse-search";

describe("toBrowseInput", () => {
  test("scopes to the selected artists", () => {
    const input = toBrowseInput(browseSearchSchema.parse({}), ["tripleS"]);
    expect(input.artist).toEqual(["tripleS"]);
  });

  test("a collection link ignores the scope", () => {
    const search = browseSearchSchema.parse({ slug: "atom01-seoyeon-204z" });
    expect(toBrowseInput(search, ["tripleS"]).artist).toEqual([]);
  });

  test("Only matches", () => {
    // the URL's `?matches=1` arrives as a string, a patch as the number
    for (const matches of ["1", 1]) {
      const on = browseSearchSchema.parse({ matches });
      expect(toBrowseInput(on, []).matches).toBe(true);
    }
    expect(toBrowseInput(browseSearchSchema.parse({}), []).matches).toBeUndefined();
  });
});

describe("browseSearchSchema", () => {
  test("drops values that do not parse", () => {
    expect(browseSearchSchema.parse({ type: "bogus" })).toMatchObject({ type: undefined });
    expect(browseSearchSchema.parse({ matches: 2 })).toMatchObject({ matches: undefined });
    expect(browseSearchSchema.parse({ matches: "yes" })).toMatchObject({ matches: undefined });
    // an old link's `match` is dropped
    expect(browseSearchSchema.parse({ match: "they_have" })).not.toHaveProperty("match");
  });

  test("an old link's facets are dropped", () => {
    expect(browseSearchSchema.parse({ member: "seoyeon", class: "First" })).toEqual({});
  });
});
