import { describe, expect, test } from "bun:test";

import { ORPCError } from "@orpc/client";
import {
  CANCEL_ASK_WAIT_HOURS,
  OFFER_REFUSALS,
  OFFER_SIDE_LIMIT,
  type OfferRefusal,
} from "@repo/api/schemas/offer";

import { refusalText as chatRefusalText } from "@/features/chat/format";
import { m } from "@/paraglide/messages";
import { check } from "@/test/check";

import { type OfferRefusalInfo, offerRefusalOf, offerRefusalText, refusedKeys } from "./refusal";

const refused = (data: Record<string, unknown>) => new ORPCError("BAD_REQUEST", { data });
const info = (reason: OfferRefusal, extra: Partial<OfferRefusalInfo> = {}): OfferRefusalInfo => ({
  reason,
  retryAt: null,
  objektIds: [],
  collectionSlugs: [],
  promised: false,
  ...extra,
});

describe("offerRefusalOf", () => {
  test("is null for a plain error and an unknown reason", () => {
    expect(offerRefusalOf(new Error("x"))).toBeNull();
    expect(offerRefusalOf(refused({ reason: "nope" }))).toBeNull();
  });

  test("keeps only string ids and slugs", () => {
    const result = offerRefusalOf(
      refused({
        reason: "not_owned",
        retryAt: "2026-10-20T12:00:00.000Z",
        objektIds: ["1", 2, null],
        collectionSlugs: "a",
        promised: "yes",
      }),
    );
    expect(result).toEqual({
      reason: "not_owned",
      retryAt: "2026-10-20T12:00:00.000Z",
      objektIds: ["1"],
      collectionSlugs: [],
      promised: false,
    });
  });

  test("promised is true only for true", () => {
    expect(offerRefusalOf(refused({ reason: "not_owned", promised: true }))?.promised).toBe(true);
  });
});

describe("offerRefusalText", () => {
  test("every refusal has a text", () => {
    for (const reason of OFFER_REFUSALS) {
      expect(String(offerRefusalText(info(reason), "x")).length).toBeGreaterThan(0);
    }
  });

  test("not_owned reads promised when the objekt is promised", () => {
    check(offerRefusalText(info("not_owned"), "A")).toBe(
      m.offer_refused_not_owned({ objekts: "A" }),
    );
    check(offerRefusalText(info("not_owned", { promised: true }), "A")).toBe(
      m.offer_refused_promised({ objekts: "A" }),
    );
  });

  test("cancel_wait without a date gives the hour count", () => {
    check(offerRefusalText(info("cancel_wait"), "")).toBe(
      m.offer_refused_cancel_wait_soon({ hours: CANCEL_ASK_WAIT_HOURS }),
    );
  });

  test("a recipient rule names the objekts it refused", () => {
    expect(offerRefusalText(info("not_wanted"), "YooYeon C2 105Z")).toBe(
      m.offer_refused_not_wanted({ objekts: "YooYeon C2 105Z" }),
    );
    expect(offerRefusalText(info("other_post"), "JiWoo D333Z #76")).toBe(
      m.offer_refused_other_post({ objekts: "JiWoo D333Z #76" }),
    );
  });

  test("the refused picks of a recipient rule are found by id", () => {
    const keys = refusedKeys(info("not_wanted", { objektIds: ["88"] }));
    expect(keys.has("88")).toBe(true);
  });

  test("too_many names the side limit", () => {
    check(offerRefusalText(info("too_many"), "")).toBe(
      m.offer_refused_too_many({ max: OFFER_SIDE_LIMIT }),
    );
  });

  test("a chat code reads the chat text", () => {
    check(offerRefusalText(info("muted"), "")).toBe(
      chatRefusalText({ reason: "muted", retryAt: null }),
    );
  });
});

describe("refusedKeys", () => {
  test("ids and any:<slug> in one set", () => {
    expect(refusedKeys({ objektIds: ["1"], collectionSlugs: ["a"] })).toEqual(
      new Set(["1", "any:a"]),
    );
  });
});
