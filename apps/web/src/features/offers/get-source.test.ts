import { describe, expect, test } from "bun:test";

import { m } from "@/paraglide/messages";

import { addLabel, pickerDescription, sourceOf } from "./get-source";

const check = (actual: unknown) => expect(actual);

describe("sourceOf", () => {
  test("only partnerLists === false is the collection", () => {
    expect(sourceOf({})).toBe("lists");
    expect(sourceOf({ partnerLists: true })).toBe("lists");
    expect(sourceOf({ partnerLists: false })).toBe("collection");
  });
});

describe("addLabel", () => {
  test("give side ignores the source", () => {
    check(addLabel("give", undefined, "Ann")).toBe(m.offer_add_mine());
    check(addLabel("give", "lists", "Ann")).toBe(m.offer_add_mine());
  });

  test("get is pending while the source is unknown", () => {
    check(addLabel("get", undefined, "Ann")).toBe(m.offer_add_theirs_pending({ name: "Ann" }));
  });

  test("get follows the source", () => {
    check(addLabel("get", "lists", "Ann")).toBe(m.offer_add_theirs({ name: "Ann" }));
    check(addLabel("get", "collection", "Ann")).toBe(
      m.offer_add_theirs_collection({ name: "Ann" }),
    );
  });
});

describe("pickerDescription", () => {
  test("give and get", () => {
    check(pickerDescription("give", "lists", "Ann")).toBe(m.offer_picker_mine_desc());
    check(pickerDescription("get", "lists", "Ann")).toBe(
      m.offer_picker_theirs_desc({ name: "Ann" }),
    );
    check(pickerDescription("get", "collection", "Ann")).toBe(
      m.offer_picker_theirs_collection_desc({ name: "Ann" }),
    );
  });
});
