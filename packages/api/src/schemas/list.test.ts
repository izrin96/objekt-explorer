import { describe, expect, test } from "bun:test";

import { copyListInputSchema, createListInputSchema, listPreviewsInputSchema } from "./list";

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
