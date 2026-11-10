import { describe, expect, test } from "bun:test";

import type { OfferView } from "@repo/api/schemas/offer";
import { fromPartial } from "@total-typescript/shoehorn";

import { counterRequest } from "./counter-request";

const item = (extra: Record<string, unknown> = {}) => ({
  collectionSlug: "a",
  objektId: null,
  serial: null,
  serialEstimated: false,
  listSlug: null,
  sentAt: null,
  ...extra,
});

const offer = (extra: Partial<OfferView> = {}) =>
  fromPartial<OfferView>({
    id: 9,
    conversationId: 4,
    give: [item(), item()],
    get: [item({ collectionSlug: "b", objektId: "77", serial: 5 })],
    topup: null,
    ...extra,
  });

describe("counterRequest", () => {
  test("keeps give any-copy asks merged and unkept, get picks kept", () => {
    const collections = {};
    const request = counterRequest(offer(), "Ann", collections);
    expect(request.to).toEqual({ conversationId: 4 });
    expect(request.name).toBe("Ann");
    expect(request.counter).toBe(9);
    expect(request.prefill?.collections).toBe(collections);
    expect(request.prefill?.give).toHaveLength(1);
    expect(request.prefill?.give?.[0]).toMatchObject({ key: "any:a", count: 2, kept: false });
    expect(request.prefill?.get).toHaveLength(1);
    expect(request.prefill?.get?.[0]).toMatchObject({ key: "77", kept: true, flags: null });
  });

  test("flips the top-up payer to the countering viewer's side", () => {
    const paidByYou = counterRequest(
      offer({ topup: { amount: "2.50", currency: "USD", payer: "you" } }),
      "Ann",
      {},
    );
    expect(paidByYou.prefill?.topup).toEqual({ amount: 2.5, currency: "USD", payer: "from" });
    const paidByThem = counterRequest(
      offer({ topup: { amount: "1.00", currency: "USD", payer: "them" } }),
      "Ann",
      {},
    );
    expect(paidByThem.prefill?.topup?.payer).toBe("to");
  });

  test("no top-up gives undefined", () => {
    expect(counterRequest(offer(), "Ann", {}).prefill?.topup).toBeUndefined();
  });
});
