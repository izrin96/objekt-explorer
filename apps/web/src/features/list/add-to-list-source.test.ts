import { describe, expect, test } from "bun:test";

import { addToListInputSchema, type AddSource, type PublicList } from "@repo/api/schemas/list";
import type { OwnedObjekt } from "@repo/lib/types/objekt";

import {
  type AddableObjekt,
  addToListInput,
  currencyChanges,
  groupLists,
  isListDisabled,
  pickableCopies,
  pickerLists,
  previewRows,
  toggleUnpicked,
  toSource,
} from "./add-to-list-source";

const collection = (slug: string) => ({ id: slug, slug }) as unknown as AddableObjekt;
const token = (slug: string, serial: number) =>
  ({
    id: `${slug}-${serial}`,
    slug,
    serial,
    tokenId: `${slug}-${serial}`,
  }) as unknown as OwnedObjekt;
const entry = (slug: string, entryId: number) =>
  ({ id: String(entryId), slug, entryId }) as unknown as AddableObjekt;

const HERE = "0xAbC";
const bound = { isProfileBind: true, profileAddress: "0xabc" };
const boundElsewhere = { isProfileBind: true, profileAddress: "0xdef" };
const unbound = { isProfileBind: false, profileAddress: null };

const a1 = token("a", 1);
const a7 = token("a", 7);
const b3 = token("b", 3);

describe("toSource", () => {
  test("an unbound list takes collections", () => {
    expect(toSource(unbound, { objekts: [a1, collection("b")] }, { address: HERE })).toEqual({
      from: { type: "collections", slugs: ["a", "b"] },
      dropped: 0,
    });
  });

  test("an unbound list that still names this profile takes collections", () => {
    const named = { isProfileBind: false, profileAddress: "0xabc" };
    expect(toSource(named, { objekts: [a1] }, { address: HERE })).toEqual({
      from: { type: "collections", slugs: ["a"] },
      dropped: 0,
    });
  });

  test("a list bound to another profile takes collections, its owner's copies", () => {
    const expected = { from: { type: "collections" as const, slugs: ["a", "b"] }, dropped: 0 };
    expect(toSource(boundElsewhere, { objekts: [a1, b3] }, { address: HERE })).toEqual(expected);
    // a page with no profile: Explore, Market, an unbound list
    expect(toSource(bound, { objekts: [a1, b3] }, {})).toEqual(expected);
  });

  test("a combined card with every copy loaded sends the copies shown", () => {
    const target = { objekts: [a1, collection("c")], combined: true, copies: [a1, a7, b3] };
    expect(toSource(bound, target, { address: HERE })).toEqual({
      from: { type: "objekts", tokenIds: [a1.tokenId, a7.tokenId] },
      dropped: 1,
    });
  });

  test("a combined card with copies still to load sends its collection", () => {
    const partial = { objekts: [a1], combined: true, copies: [a1, a7], copiesPartial: true };
    const expected = { from: { type: "collections" as const, slugs: ["a"] }, dropped: 0 };
    expect(toSource(bound, partial, { address: HERE })).toEqual(expected);
    // the progress view knows no copies at all
    expect(toSource(bound, { objekts: [a1], combined: true }, { address: HERE })).toEqual(expected);
    // an untick of a copy no longer listed is no untick
    expect(toSource(bound, partial, { address: HERE, unpicked: new Set(["gone"]) })).toEqual(
      expected,
    );
  });

  test("a combined card with a serial unticked sends the rest of its copies", () => {
    const target = { objekts: [a1], combined: true, copies: [a1, a7, b3], copiesPartial: true };
    expect(toSource(bound, target, { address: HERE, unpicked: new Set([a1.tokenId]) })).toEqual({
      from: { type: "objekts", tokenIds: [a7.tokenId] },
      dropped: 0,
    });
  });

  test("single tokens with nothing unticked send each token", () => {
    expect(toSource(bound, { objekts: [a1, a7, collection("c")] }, { address: HERE })).toEqual({
      from: { type: "objekts", tokenIds: [a1.tokenId, a7.tokenId] },
      dropped: 1,
    });
  });

  test("single tokens drop the unowned and the unticked", () => {
    const target = { objekts: [a1, a7, collection("c")] };
    expect(toSource(bound, target, { address: HERE, unpicked: new Set([a7.tokenId]) })).toEqual({
      from: { type: "objekts", tokenIds: [a1.tokenId] },
      dropped: 1,
    });
  });

  test("a list hiding serials hands out its entries", () => {
    const target = { objekts: [entry("a", 4), collection("b")] };
    expect(toSource(bound, target, { address: HERE, sourceList: "hidden" })).toEqual({
      from: { type: "list", slug: "hidden", entryIds: [4] },
      dropped: 1,
    });
  });

  test("nothing left to add", () => {
    expect(
      toSource(bound, { objekts: [a1] }, { address: HERE, unpicked: new Set([a1.tokenId]) }),
    ).toBeNull();
    expect(
      toSource(bound, { objekts: [collection("b")] }, { address: HERE, sourceList: "hidden" }),
    ).toBeNull();
  });
});

describe("groupLists", () => {
  const list = (slug: string, profileAddress: string | null, isProfileBind = true) => ({
    slug,
    isProfileBind: isProfileBind && profileAddress !== null,
    profileAddress,
  });

  test("unbound first, then a group per profile, this page's profile leading", () => {
    const lists = [
      list("other-have", "0xDEF"),
      list("want", null),
      list("named-general", "0xabc", false),
      { slug: "bound-nowhere", isProfileBind: true, profileAddress: null },
      list("here-have", "0xabc"),
      list("other-sale", "0xdef"),
      list("here-sale", "0xABC"),
    ];
    const { unbound, bound } = groupLists(lists, HERE);
    expect(unbound.map((l) => l.slug)).toEqual(["want", "named-general", "bound-nowhere"]);
    expect(bound.map((g) => [g.address, g.lists.map((l) => l.slug)])).toEqual([
      ["0xabc", ["here-have", "here-sale"]],
      ["0xdef", ["other-have", "other-sale"]],
    ]);
  });
});

type PickerList = Pick<PublicList, "slug" | "listType" | "isProfileBind" | "profileAddress">;
const pickerList = (
  slug: string,
  listType: PublicList["listType"],
  profileAddress: string | null,
): PickerList => ({ slug, listType, isProfileBind: profileAddress !== null, profileAddress });

describe("pickerLists", () => {
  const lists = [
    pickerList("sale-a", "sale", "0xAAA"),
    pickerList("sale-b", "sale", "0xbbb"),
    pickerList("sale-unbound", "sale", null),
    pickerList("have-a", "have", "0xaaa"),
    pickerList("want-b", "want", "0xbbb"),
  ];
  const slugs = (picked: PickerList[]) => picked.map((l) => l.slug);

  test("without saleOnly every list stays, the same array", () => {
    expect(pickerLists(lists, undefined)).toBe(lists);
  });

  test("saleOnly with no profiles keeps only bound sale lists", () => {
    expect(slugs(pickerLists(lists, { profiles: null }))).toEqual(["sale-a", "sale-b"]);
  });

  test("saleOnly with profiles keeps the sale lists bound to them, in any letter case", () => {
    expect(slugs(pickerLists(lists, { profiles: ["0xaaa"] }))).toEqual(["sale-a"]);
    expect(slugs(pickerLists(lists, { profiles: ["0xBBB", "0xAaA"] }))).toEqual([
      "sale-a",
      "sale-b",
    ]);
  });

  test("a bound sale list with no address is dropped when profiles are set", () => {
    const noAddress = { ...pickerList("sale-x", "sale", null), isProfileBind: true };
    expect(slugs(pickerLists([noAddress], { profiles: ["0xaaa"] }))).toEqual([]);
    expect(slugs(pickerLists([noAddress], { profiles: null }))).toEqual(["sale-x"]);
  });
});

describe("isListDisabled", () => {
  const unowned = { objekts: [collection("c")] };
  const owned = { objekts: [collection("c"), a1] };

  test("an unbound list is never disabled", () => {
    expect(isListDisabled(unbound, unowned, { address: HERE, sourceList: undefined })).toBe(false);
  });

  test("a list bound to another profile is never disabled", () => {
    expect(isListDisabled(boundElsewhere, unowned, { address: HERE, sourceList: undefined })).toBe(
      false,
    );
  });

  test("a list bound here is disabled when nothing is owned and there is no source list", () => {
    expect(isListDisabled(bound, unowned, { address: HERE, sourceList: undefined })).toBe(true);
  });

  test("a source list or one owned objekt keeps it enabled", () => {
    expect(isListDisabled(bound, unowned, { address: HERE, sourceList: "hidden" })).toBe(false);
    expect(isListDisabled(bound, owned, { address: HERE, sourceList: undefined })).toBe(false);
  });
});

describe("currencyChanges", () => {
  const list = (slug: string, currency: string | null) => ({ slug, currency });
  const krw = list("krw", "KRW");
  const lists = [krw, list("krw-2", "KRW"), list("usd", "USD"), list("plain", null)];

  test("the same currency does not change", () => {
    expect(currencyChanges(lists, krw, "krw-2")).toBe(false);
  });

  test("a different currency changes", () => {
    expect(currencyChanges(lists, krw, "usd")).toBe(true);
  });

  test("nothing selected: an unpriced next does not change, a priced one does", () => {
    expect(currencyChanges(lists, undefined, "plain")).toBe(false);
    expect(currencyChanges(lists, undefined, "usd")).toBe(true);
  });

  test("an unknown or null next counts as no currency", () => {
    expect(currencyChanges(lists, undefined, "missing")).toBe(false);
    expect(currencyChanges(lists, undefined, null)).toBe(false);
    expect(currencyChanges(lists, krw, "missing")).toBe(true);
    expect(currencyChanges(lists, krw, null)).toBe(true);
  });
});

describe("toggleUnpicked", () => {
  test("adds a missing id and removes a present one", () => {
    expect([...toggleUnpicked(new Set(["a"]), "b")]).toEqual(["a", "b"]);
    expect([...toggleUnpicked(new Set(["a", "b"]), "a")]).toEqual(["b"]);
  });

  test("never changes the set it was given", () => {
    const given = new Set(["a"]);
    toggleUnpicked(given, "b");
    toggleUnpicked(given, "a");
    expect([...given]).toEqual(["a"]);
  });
});

describe("pickableCopies", () => {
  test("a combined card offers its loaded copies; a list hiding serials offers none", () => {
    const target = { objekts: [a1], combined: true, copies: [a1, a7, b3] };
    expect(pickableCopies(target, undefined)).toEqual([a1, a7]);
    expect(pickableCopies(target, "hidden")).toEqual([]);
  });
});

describe("previewRows", () => {
  test("one row per collection, copies by serial", () => {
    expect(previewRows([a7, a1, b3], [a7, a1, b3])).toEqual([
      { objekt: a7, copies: [a1, a7] },
      { objekt: b3, copies: [b3] },
    ]);
  });
});

describe("addToListInput", () => {
  const base = {
    slug: "my-list",
    skipDups: true,
    from: { type: "collections", slugs: ["a"] } as AddSource,
    isSale: true,
    isQyop: false,
    price: null as number | null,
    note: "",
  };
  const build = (over: Partial<typeof base> = {}) => {
    const input = addToListInput({ ...base, ...over });
    addToListInputSchema.parse(input);
    return input;
  };

  test("a non-sale body has no sale keys, whatever was typed", () => {
    const input = build({ isSale: false, isQyop: true, price: 5, note: "hi" });
    expect(input).not.toHaveProperty("isQyop");
    expect(input).not.toHaveProperty("price");
    expect(input).not.toHaveProperty("note");
  });

  test("a sale price goes as typed", () => {
    expect(build({ price: 12.5 })).toMatchObject({ price: 12.5, isQyop: false });
  });

  test("a price of 0 or none goes as null", () => {
    expect(build({ price: 0 }).price).toBeNull();
    expect(build({ price: null }).price).toBeNull();
  });

  test("QYOP drops the price", () => {
    expect(build({ isQyop: true, price: 12.5 })).toMatchObject({ price: null, isQyop: true });
  });

  test("the note is trimmed, and null when only spaces", () => {
    expect(build({ note: "  hi " }).note).toBe("hi");
    expect(build({ note: "   " }).note).toBeNull();
  });

  test("from passes through for each kind", () => {
    const sources: AddSource[] = [
      { type: "objekts", tokenIds: ["1", "2"] },
      { type: "collections", slugs: ["a", "b"] },
      { type: "list", slug: "other", entryIds: [3, 4] },
    ];
    for (const from of sources) expect(build({ from }).from).toEqual(from);
  });

  test("slug and skipDups pass through", () => {
    expect(build({ slug: "x", skipDups: false })).toMatchObject({ slug: "x", skipDups: false });
  });
});
