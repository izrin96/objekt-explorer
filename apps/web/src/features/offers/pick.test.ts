import { describe, expect, test } from "bun:test";

import { fromPartial } from "@total-typescript/shoehorn";

import { m } from "@/paraglide/messages";
import { check } from "@/test/check";

import { type OfferPick, anyKey, blockedReason, pickKey, toPick } from "./pick";

type Candidate = Parameters<typeof toPick>[0];
const candidate = (extra: Partial<Candidate> = {}) =>
  fromPartial<Candidate>({
    collectionSlug: "atom01-seoyeon-101z",
    objektId: "42",
    serial: 7,
    serialEstimated: false,
    listSlug: null,
    transferable: true,
    reserved: false,
    inOpenOffer: [],
    copies: null,
    ...extra,
  });

describe("pickKey", () => {
  test("is the objekt id, or any:<slug> for an any-copy ask", () => {
    expect(pickKey({ collectionSlug: "a", objektId: "42" })).toBe("42");
    expect(pickKey({ collectionSlug: "a", objektId: null })).toBe(anyKey("a"));
    expect(anyKey("a")).toBe("any:a");
  });
});

describe("toPick", () => {
  test("copies the flags", () => {
    const pick = toPick(candidate({ reserved: true, inOpenOffer: [3], copies: 2 }));
    expect(pick.key).toBe("42");
    expect(pick.flags).toEqual({
      transferable: true,
      reserved: true,
      inOpenOffer: [3],
      copies: 2,
    });
  });

  test("adds ratio only when defined", () => {
    expect("ratio" in toPick(candidate())).toBe(false);
    expect(toPick(candidate({ ratio: 2 })).ratio).toBe(2);
  });
});

describe("blockedReason", () => {
  const flags = (extra: Partial<NonNullable<OfferPick["flags"]>>) => ({
    transferable: true,
    reserved: false,
    inOpenOffer: [],
    copies: null,
    ...extra,
  });

  test("is null without flags and for a clean pick", () => {
    expect(blockedReason(null)).toBeNull();
    expect(blockedReason(flags({}))).toBeNull();
  });

  test("not transferable wins over reserved", () => {
    check(blockedReason(flags({ transferable: false, reserved: true }))).toBe(
      m.offer_flag_not_transferable(),
    );
  });

  test("reserved", () => {
    check(blockedReason(flags({ reserved: true }))).toBe(m.offer_flag_reserved());
  });
});
