import { describe, expect, test } from "bun:test";

import {
  copyListInputSchema,
  createListInputSchema,
  editListInputSchema,
} from "@repo/api/schemas/list";
import slugify from "slugify";

import { displayNickname } from "@/lib/address";
import { zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

import {
  bindNote,
  EMPTY_DRAFT,
  isBindable,
  isListType,
  LIST_TYPE_DESC,
  type ListDraft,
  listDraftSchema,
  listTypePatch,
  NONE,
  profileLabel,
  profilePatch,
  slugPreview,
  toCreateInput,
  toEditInput,
} from "./list-draft";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const PROFILES = [{ address: A }, { address: B }];

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

describe("isListType", () => {
  test("accepts a list type and nothing else", () => {
    expect(isListType("sale")).toBe(true);
    expect(isListType("x")).toBe(false);
    expect(isListType(undefined)).toBe(false);
  });
});

describe("isBindable", () => {
  test("have and sale bind; general and want do not", () => {
    expect(isBindable("have")).toBe(true);
    expect(isBindable("sale")).toBe(true);
    expect(isBindable("general")).toBe(false);
    expect(isBindable("want")).toBe(false);
  });
});

describe("LIST_TYPE_DESC", () => {
  test("each type reads its own description", () => {
    check(LIST_TYPE_DESC.general()).toBe(m.list_create_general_list_desc());
    check(LIST_TYPE_DESC.have()).toBe(m.list_create_have_list_desc());
    check(LIST_TYPE_DESC.want()).toBe(m.list_create_want_list_desc());
    check(LIST_TYPE_DESC.sale()).toBe(m.list_create_sale_list_desc());
  });
});

describe("listTypePatch", () => {
  test("entering have binds to the first profile", () => {
    expect(listTypePatch(draft(), "have", PROFILES)).toEqual({
      listType: "have",
      linkedListId: null,
      profileAddress: A,
      isProfileBind: true,
    });
  });

  test("entering sale keeps the chosen profile and binds", () => {
    expect(listTypePatch(draft({ profileAddress: B }), "sale", PROFILES)).toMatchObject({
      listType: "sale",
      profileAddress: B,
      isProfileBind: true,
    });
  });

  test("entering have with no profiles stays unbound", () => {
    expect(listTypePatch(draft(), "have", [])).toMatchObject({
      profileAddress: null,
      isProfileBind: false,
    });
  });

  test("moving between have and sale keeps the binding the user set", () => {
    const unbound = draft({ listType: "have", profileAddress: A, isProfileBind: false });
    expect(listTypePatch(unbound, "sale", PROFILES).isProfileBind).toBe(false);
    const bound = draft({ listType: "have", profileAddress: A, isProfileBind: true });
    expect(listTypePatch(bound, "sale", PROFILES).isProfileBind).toBe(true);
  });

  test("leaving have for want unbinds and keeps the address", () => {
    const bound = draft({ listType: "have", profileAddress: B, isProfileBind: true });
    expect(listTypePatch(bound, "want", PROFILES)).toMatchObject({
      listType: "want",
      profileAddress: B,
      isProfileBind: false,
    });
  });

  test("changing type drops the linked list", () => {
    expect(
      listTypePatch(draft({ listType: "want", linkedListId: 5 }), "have", PROFILES).linkedListId,
    ).toBeNull();
  });

  test("null falls back to general", () => {
    expect(listTypePatch(draft({ listType: "sale" }), null, PROFILES).listType).toBe("general");
  });

  test("the patch has exactly four keys", () => {
    expect(
      Object.keys(listTypePatch(draft(), "have", PROFILES)).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["isProfileBind", "linkedListId", "listType", "profileAddress"]);
  });
});

describe("profilePatch", () => {
  test("NONE and null clear the profile and the binding", () => {
    const bound = draft({ profileAddress: A, isProfileBind: true });
    for (const next of [NONE, null]) {
      expect(profilePatch(bound, next)).toEqual({ profileAddress: null, isProfileBind: false });
    }
  });

  test("an address keeps the current binding", () => {
    expect(profilePatch(draft({ isProfileBind: true }), B)).toEqual({
      profileAddress: B,
      isProfileBind: true,
    });
    expect(profilePatch(draft({ isProfileBind: false }), B)).toEqual({
      profileAddress: B,
      isProfileBind: false,
    });
  });
});

describe("profileLabel", () => {
  test("matches a mixed-case address to its nickname", () => {
    const profiles = [{ address: A, nickname: "Alice" }];
    expect(profileLabel(A.toUpperCase().replace("0X", "0x"), profiles)).toBe(
      displayNickname(A, "Alice"),
    );
  });

  test("with no match it shows the address", () => {
    expect(profileLabel(B, [{ address: A, nickname: "Alice" }])).toBe(
      displayNickname(B, undefined),
    );
  });
});

describe("bindNote", () => {
  test("create with have and no profiles asks to link one", () => {
    expect(bindNote(draft({ listType: "have" }), "create", 0)).toBe("link");
  });

  test("create with sale, profiles and no binding says binding is off", () => {
    expect(bindNote(draft({ listType: "sale", isProfileBind: false }), "create", 2)).toBe("off");
  });

  test("create with a binding and profiles has no note", () => {
    expect(bindNote(draft({ listType: "have", isProfileBind: true }), "create", 2)).toBeNull();
  });

  test("edit never has a note", () => {
    for (const profileCount of [0, 2]) {
      expect(bindNote(draft({ listType: "have" }), "edit", profileCount)).toBeNull();
    }
  });

  test("general and want never have a note", () => {
    for (const listType of ["general", "want"] as const) {
      expect(bindNote(draft({ listType }), "create", 0)).toBeNull();
    }
  });
});

describe("slugPreview", () => {
  const url = { nickname: "n", profileSlug: "kept-slug", fallbackSlug: "fallback" };

  test("without regeneration it shows the current slug", () => {
    expect(slugPreview("Anything", url, false)).toBe(url.profileSlug);
  });

  test("regenerating slugifies the name", () => {
    expect(slugPreview("My List!", url, true)).toBe("my-list");
  });

  test("a name that slugifies to nothing uses the fallback", () => {
    expect(slugPreview("!!!", url, true)).toBe(url.fallbackSlug);
  });

  test("a Hangul-only name follows slugify itself", () => {
    const name = "한글 목록";
    expect(slugPreview(name, url, true)).toBe(
      slugify(name, { lower: true, strict: true }) || url.fallbackSlug,
    );
  });
});
