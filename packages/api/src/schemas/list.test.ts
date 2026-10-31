import { describe, expect, test } from "bun:test";

import {
  copyListInputSchema,
  createListInputSchema,
  listPreviewsInputSchema,
  profileSlugBase,
} from "./list";

const base = {
  name: "x",
  linkedListId: null,
  profileAddress: null,
  description: null,
  currency: null,
};

describe("createListInputSchema", () => {
  test("no listType is a general list", () => {
    expect(createListInputSchema.parse(base).listType).toBe("general");
  });

  test("a want list that leaves Open to out is open to swaps and buying", () => {
    expect(createListInputSchema.parse({ ...base, listType: "want" })).toMatchObject({
      matchSale: true,
      matchHave: true,
    });
  });
});

describe("copyListInputSchema", () => {
  test("takes the source slug beside the new list's fields", () => {
    const input = { ...base, sourceSlug: "abc", listType: "sale" };
    expect(copyListInputSchema.parse(input)).toMatchObject({ sourceSlug: "abc", listType: "sale" });
  });
});

describe("listPreviewsInputSchema", () => {
  test("takes the array /rpc sends", () => {
    expect(listPreviewsInputSchema.parse({ slugs: ["a", "b"] })).toEqual({ slugs: ["a", "b"] });
  });

  test("takes one query-string value as a one-slug array", () => {
    expect(listPreviewsInputSchema.parse({ slugs: "a" })).toEqual({ slugs: ["a"] });
  });
});

describe("profileSlugBase", () => {
  test("lowercases and drops what slugify strips", () => {
    expect(profileSlugBase("My List!")).toBe("my-list");
  });

  test("stops at 90 characters, with no dash left at the cut", () => {
    expect(profileSlugBase(`${"a".repeat(89)} ${"b".repeat(40)}`)).toBe("a".repeat(89));
    expect(profileSlugBase("c".repeat(120))).toHaveLength(90);
  });

  test("a name with nothing slugify keeps is empty", () => {
    expect(profileSlugBase("!!!")).toBe("");
  });
});
