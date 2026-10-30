import { describe, expect, test } from "bun:test";

import {
  copyListInputSchema,
  createListInputSchema,
  editListInputSchema,
} from "@repo/api/schemas/list";

import { zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import {
  EMPTY_DRAFT,
  type ListDraft,
  listDraftSchema,
  toCreateInput,
  toEditInput,
} from "./list-draft";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const draft = (patch: Partial<ListDraft> = {}): ListDraft => ({
  ...EMPTY_DRAFT,
  name: "My list",
  ...patch,
});

const errorsOf = (patch: Partial<ListDraft> = {}) => zodErrors(listDraftSchema(), draft(patch));

describe("EMPTY_DRAFT", () => {
  test("is a general list open to swaps and buying", () => {
    expect(EMPTY_DRAFT.listType).toBe("general");
    expect(EMPTY_DRAFT.matchSale).toBe(true);
    expect(EMPTY_DRAFT.matchHave).toBe(true);
  });
});

describe("listDraftSchema", () => {
  test("a valid draft has no errors", () => {
    expect(errorsOf()).toEqual({});
  });

  test("a name of only spaces is required", () => {
    check(errorsOf({ name: "   " })).toEqual({ name: [m.common_validation_required_name()] });
  });

  test("a sale list needs a three-letter currency", () => {
    for (const currency of ["", "US1"]) {
      check(errorsOf({ listType: "sale", currency })).toEqual({
        currency: [m.list_create_currency_invalid()],
      });
    }
  });

  test("a sale list takes a lower-case currency", () => {
    expect(errorsOf({ listType: "sale", currency: "usd" })).toEqual({});
  });

  test("a general list needs no currency", () => {
    expect(errorsOf({ listType: "general", currency: "" })).toEqual({});
  });

  test("binding to a profile needs one", () => {
    check(errorsOf({ listType: "have", isProfileBind: true, profileAddress: null })).toEqual({
      profileAddress: [m.list_create_profile_required()],
    });
  });
});

describe("toCreateInput", () => {
  test("trims the name and description, and a blank description is null", () => {
    expect(toCreateInput(draft({ name: "  Mine  ", description: "  hi  " }))).toMatchObject({
      name: "Mine",
      description: "hi",
    });
    expect(toCreateInput(draft({ description: "   " })).description).toBeNull();
  });

  test("the currency is upper-cased for sale and null for any other type", () => {
    expect(toCreateInput(draft({ listType: "sale", currency: "usd" })).currency).toBe("USD");
    for (const listType of ["general", "have", "want"] as const) {
      expect(toCreateInput(draft({ listType, currency: "usd" })).currency).toBeNull();
    }
  });

  test("the linked list is kept only for have and want", () => {
    for (const listType of ["have", "want"] as const) {
      expect(toCreateInput(draft({ listType, linkedListId: 7 })).linkedListId).toBe(7);
    }
    for (const listType of ["general", "sale"] as const) {
      expect(toCreateInput(draft({ listType, linkedListId: 7 })).linkedListId).toBeNull();
    }
  });

  test("the profile binding is kept for have and sale, and off for general and want", () => {
    const bound = { isProfileBind: true, profileAddress: ADDRESS };
    expect(toCreateInput(draft({ listType: "have", ...bound })).isProfileBind).toBe(true);
    expect(toCreateInput(draft({ listType: "sale", ...bound })).isProfileBind).toBe(true);
    expect(toCreateInput(draft({ listType: "general", ...bound })).isProfileBind).toBe(false);
    expect(toCreateInput(draft({ listType: "want", ...bound })).isProfileBind).toBe(false);
  });

  test("the profile address and hide serial pass through", () => {
    const input = toCreateInput(draft({ profileAddress: ADDRESS, hideSerial: true }));
    expect(input.profileAddress).toBe(ADDRESS);
    expect(input.hideSerial).toBe(true);
  });

  const cases: [string, Partial<ListDraft>][] = [
    ["general", { listType: "general", profileAddress: ADDRESS, description: "d" }],
    ["have", { listType: "have", linkedListId: 3, isProfileBind: true, profileAddress: ADDRESS }],
    ["want", { listType: "want", linkedListId: 3, matchHave: false }],
    ["sale", { listType: "sale", currency: "usd", isProfileBind: true, profileAddress: ADDRESS }],
  ];

  describe.each(cases)("%s list", (_name, patch) => {
    test("create input parses to itself plus the schema's defaults", () => {
      const input = toCreateInput(draft(patch));
      expect(createListInputSchema.parse(input)).toEqual({ ...input, discoverable: false });
    });

    test("copy input parses to itself plus the schema's defaults", () => {
      const input = { ...toCreateInput(draft(patch)), sourceSlug: "src" };
      expect(copyListInputSchema.parse(input)).toEqual({ ...input, discoverable: false });
    });
  });
});

describe("toEditInput", () => {
  test("leaves out what belongs to the post and carries slug, grid and slug regeneration", () => {
    const input = toEditInput(
      "my-list",
      draft({
        listType: "have",
        isProfileBind: true,
        linkedListId: 3,
        profileAddress: ADDRESS,
        gridColumns: 6,
        regenerateSlug: true,
      }),
    );
    for (const key of ["listType", "isProfileBind", "linkedListId", "matchSale", "matchHave"]) {
      expect(input).not.toHaveProperty(key);
    }
    expect(input).toMatchObject({ slug: "my-list", gridColumns: 6, regenerateSlug: true });
  });

  test("parses to itself with a null or a set grid", () => {
    for (const gridColumns of [null, 4]) {
      const input = toEditInput("my-list", draft({ profileAddress: ADDRESS, gridColumns }));
      expect(editListInputSchema.parse(input)).toEqual(input);
    }
  });
});
