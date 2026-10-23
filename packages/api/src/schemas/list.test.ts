import { describe, expect, test } from "bun:test";

import { copyListInputSchema, createListInputSchema } from "./list";

const base = {
  name: "x",
  linkedListId: null,
  profileAddress: null,
  description: null,
  currency: null,
};

describe("createListInputSchema", () => {
  test("reads the listTypeNew an older tab sends", () => {
    expect(createListInputSchema.parse({ ...base, listTypeNew: "want" }).listType).toBe("want");
  });

  test("listType wins over listTypeNew", () => {
    const input = { ...base, listType: "have", listTypeNew: "want" };
    expect(createListInputSchema.parse(input).listType).toBe("have");
  });

  test("neither key is a general list", () => {
    expect(createListInputSchema.parse(base).listType).toBe("general");
  });
});

describe("copyListInputSchema", () => {
  test("reads the listTypeNew an older tab sends", () => {
    const input = { ...base, sourceSlug: "abc", listTypeNew: "sale" };
    expect(copyListInputSchema.parse(input).listType).toBe("sale");
  });
});
