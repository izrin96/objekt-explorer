import { describe, expect, test } from "bun:test";

import { addToListInputSchema, type AddSource } from "@repo/api/schemas/list";
import type { OwnedObjekt } from "@repo/lib/types/objekt";

import {
  type AddableObjekt,
  addToListInput,
  groupLists,
  pickableCopies,
  previewRows,
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
