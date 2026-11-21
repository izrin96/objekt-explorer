import { describe, expect, test } from "bun:test";

import {
  copyListInputSchema,
  createListInputSchema,
  editListInputSchema,
  listPreviewsInputSchema,
  needsTradeHandle,
  slugPreviewInputSchema,
} from "./list";

const base = {
  name: "x",
  linkedListId: null,
  profileAddress: null,
  description: null,
  currency: null,
};

const editBase = {
  slug: "abc",
  name: "x",
  gridColumns: null,
  profileAddress: null,
  description: null,
  currency: null,
  hideSerial: false,
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

describe("list description", () => {
  test("is cleaned on create, copy and edit", () => {
    const description = "\n  WTT only\r\n\n\n\ndm me  \n";
    expect(createListInputSchema.parse({ ...base, description }).description).toBe(
      "  WTT only\n\n\n\ndm me",
    );
    expect(copyListInputSchema.parse({ ...base, sourceSlug: "abc", description }).description).toBe(
      "  WTT only\n\n\n\ndm me",
    );
    const edited = editListInputSchema.parse({ ...editBase, description });
    expect(edited.description).toBe("  WTT only\n\n\n\ndm me");
  });

  test("blank text is no description, and null stays null", () => {
    expect(createListInputSchema.parse({ ...base, description: " \n " }).description).toBeNull();
    expect(createListInputSchema.parse(base).description).toBeNull();
  });

  test("the 5000 limit still applies to what is sent", () => {
    const long = "a".repeat(5001);
    expect(createListInputSchema.safeParse({ ...base, description: long }).success).toBe(false);
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

describe("needsTradeHandle", () => {
  const ADDRESS = "0xabc0000000000000000000000000000000000001";
  const unboundWant = {
    listType: "want" as const,
    isProfileBind: false,
    discoverable: true,
    profileAddress: null,
    linkedList: null,
  };

  test("an unbound want list on Trade needs its owner's handle", () => {
    expect(needsTradeHandle(unboundWant)).toBe(true);
    expect(needsTradeHandle({ ...unboundWant, linkedList: { profileAddress: null } })).toBe(true);
  });

  test("a list with an address of its own does not", () => {
    expect(
      needsTradeHandle({
        ...unboundWant,
        listType: "have",
        isProfileBind: true,
        profileAddress: ADDRESS,
      }),
    ).toBe(false);
  });

  test("a want list linked to a list with an address does not", () => {
    expect(needsTradeHandle({ ...unboundWant, linkedList: { profileAddress: ADDRESS } })).toBe(
      false,
    );
  });

  test("a list off Trade does not", () => {
    expect(needsTradeHandle({ ...unboundWant, discoverable: false })).toBe(false);
    expect(needsTradeHandle({ ...unboundWant, discoverable: null })).toBe(false);
  });

  test("a list that can't be on Trade does not, whatever its switch says", () => {
    expect(needsTradeHandle({ ...unboundWant, listType: "have" })).toBe(false);
    expect(needsTradeHandle({ ...unboundWant, listType: "general" })).toBe(false);
  });
});
