import { describe, expect, test } from "bun:test";

import { m } from "@/paraglide/messages";
import { check } from "@/test/check";

import { type CopySource, toCopyDraft } from "./copy-draft";
import { EMPTY_DRAFT } from "./list-draft";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const GONE = "0xcccccccccccccccccccccccccccccccccccccccc";
const PROFILES = [{ address: A }, { address: B }];

const source = (patch: Partial<CopySource> = {}): CopySource => ({
  name: "spares",
  description: "doubles",
  listType: "have",
  currency: null,
  profileAddress: B,
  isProfileBind: true,
  matchSale: true,
  matchHave: true,
  gridColumns: 4,
  hideSerial: true,
  ...patch,
});

describe("toCopyDraft without a fixed type", () => {
  test("keeps the source's own choices, but never its partner or ratio", () => {
    const sale = source({
      listType: "sale",
      currency: "USD",
      profileAddress: GONE,
      isProfileBind: false,
    });
    check(toCopyDraft(sale, { profiles: PROFILES })).toEqual({
      name: m.list_copy_name({ name: "spares" }),
      description: "doubles",
      listType: "sale",
      currency: "USD",
      linkedListId: null,
      profileAddress: GONE,
      isProfileBind: false,
      matchSale: EMPTY_DRAFT.matchSale,
      matchHave: EMPTY_DRAFT.matchHave,
      gridColumns: 4,
      hideSerial: true,
      regenerateSlug: false,
      ratio: null,
    });
  });

  test("a want source keeps its Open to", () => {
    const draft = toCopyDraft(source({ listType: "want", matchSale: false, matchHave: true }), {
      profiles: PROFILES,
    });
    expect(draft.matchSale).toBe(false);
    expect(draft.matchHave).toBe(true);
  });
});

describe("toCopyDraft with a fixed type", () => {
  test("want to want keeps Open to", () => {
    const draft = toCopyDraft(source({ listType: "want", matchSale: false, matchHave: true }), {
      fixedType: "want",
      profiles: PROFILES,
    });
    expect(draft.listType).toBe("want");
    expect(draft.isProfileBind).toBe(false);
    expect(draft.matchSale).toBe(false);
    expect(draft.matchHave).toBe(true);
  });

  test("have to sale is bound to the source's profile and carries no currency", () => {
    const draft = toCopyDraft(source({ listType: "have" }), {
      fixedType: "sale",
      profiles: PROFILES,
    });
    expect(draft.listType).toBe("sale");
    expect(draft.isProfileBind).toBe(true);
    expect(draft.profileAddress).toBe(B);
    expect(draft.currency).toBe("");
  });

  test("the source's profile matches in any letter case", () => {
    const draft = toCopyDraft(source({ profileAddress: B.toUpperCase().replace("0X", "0x") }), {
      fixedType: "have",
      profiles: PROFILES,
    });
    expect(draft.profileAddress).toBe(B.toUpperCase().replace("0X", "0x"));
  });

  test("a have source's leftover currency is not carried into a sale copy", () => {
    const draft = toCopyDraft(source({ listType: "have", currency: "JPY" }), {
      fixedType: "sale",
      profiles: PROFILES,
    });
    expect(draft.currency).toBe("");
  });

  test("sale to sale carries the currency", () => {
    const draft = toCopyDraft(source({ listType: "sale", currency: "KRW" }), {
      fixedType: "sale",
      profiles: PROFILES,
    });
    expect(draft.currency).toBe("KRW");
  });

  test("an unbound general list copied as have falls back to the first profile", () => {
    const draft = toCopyDraft(
      source({ listType: "general", profileAddress: null, isProfileBind: false }),
      { fixedType: "have", profiles: PROFILES },
    );
    expect(draft.listType).toBe("have");
    expect(draft.isProfileBind).toBe(true);
    expect(draft.profileAddress).toBe(A);
  });

  test("sale to want resets Open to", () => {
    const draft = toCopyDraft(
      source({ listType: "sale", currency: "USD", matchSale: false, matchHave: false }),
      { fixedType: "want", profiles: PROFILES },
    );
    expect(draft.listType).toBe("want");
    expect(draft.matchSale).toBe(EMPTY_DRAFT.matchSale);
    expect(draft.matchHave).toBe(EMPTY_DRAFT.matchHave);
  });

  test("a source whose profile the viewer no longer has falls back to the first profile", () => {
    const draft = toCopyDraft(source({ profileAddress: GONE }), {
      fixedType: "have",
      profiles: PROFILES,
    });
    expect(draft.profileAddress).toBe(A);
  });

  test("with no profile at all the address is empty", () => {
    const draft = toCopyDraft(source({ profileAddress: GONE }), {
      fixedType: "want",
      profiles: [],
    });
    expect(draft.profileAddress).toBeNull();
  });

  test("keeps name, description, columns and hide serial, and drops partner and ratio", () => {
    const draft = toCopyDraft(source(), { fixedType: "sale", profiles: PROFILES });
    check(draft.name).toEqual(m.list_copy_name({ name: "spares" }));
    expect(draft.description).toBe("doubles");
    expect(draft.gridColumns).toBe(4);
    expect(draft.hideSerial).toBe(true);
    expect(draft.linkedListId).toBeNull();
    expect(draft.ratio).toBeNull();
  });
});
