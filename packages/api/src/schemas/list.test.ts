import { describe, expect, test } from "bun:test";

import {
  copyListInputSchema,
  createListInputSchema,
  listPreviewsInputSchema,
  slugPreviewInputSchema,
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

describe("slugPreviewInputSchema", () => {
  test("takes a name the edit form would save", () => {
    expect(slugPreviewInputSchema.parse({ slug: "abc", name: "My List" }).name).toBe("My List");
  });

  test("refuses an empty name and one longer than a list name may be", () => {
    expect(slugPreviewInputSchema.safeParse({ slug: "abc", name: "" }).success).toBe(false);
    expect(slugPreviewInputSchema.safeParse({ slug: "abc", name: "a".repeat(257) }).success).toBe(
      false,
    );
  });
});
