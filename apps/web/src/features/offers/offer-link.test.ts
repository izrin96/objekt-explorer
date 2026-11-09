import { describe, expect, test } from "bun:test";

import type { OfferView } from "@repo/api/schemas/offer";
import { fromPartial } from "@total-typescript/shoehorn";

import { counterRequest } from "./counter-request";
import {
  backPath,
  listSlugsOf,
  offerLink,
  offerSearchSchema,
  partnerHandle,
  requestOf,
  withoutLists,
  type OfferStart,
} from "./offer-link";
import { anyKey } from "./pick";

const partner = { userId: "u-rin", name: "rin.trades" };

/** What the page reads back: the link's search, through the route's own schema. */
function roundTrip(start: OfferStart) {
  const link = offerLink(start);
  const search = offerSearchSchema.parse(link.search);
  return { link, search, request: requestOf(search, partner) };
}

describe("offerLink and requestOf", () => {
  test("a Trade row's matches under Compare with and Can swap only", () => {
    const { link, request } = roundTrip({
      handle: "rin.trades",
      to: { list: "doubles01" },
      matches: { list: "mywants1", mutual: true },
      from: "/trade/for-you?mutual=true",
    });
    expect(link.to).toBe("/trade/@{$handle}/offer");
    expect(link.params).toEqual({ handle: "rin.trades" });
    expect(request).toEqual({
      to: { target: { kind: "list", slug: "doubles01" } },
      name: "rin.trades",
      matches: { partnerId: "u-rin", list: "mywants1", mutual: true },
    });
  });

  test("a row with no matches opens bare", () => {
    const { request } = roundTrip({ handle: "rin.trades", to: { list: "doubles01" } });
    expect(request).toEqual({
      to: { target: { kind: "list", slug: "doubles01" } },
      name: "rin.trades",
    });
  });

  test("one post's matches, with its offering list for the picker", () => {
    const { request } = roundTrip({
      handle: "rin.trades",
      to: { list: "spares001" },
      startList: "spares001",
      matches: { post: "spares001" },
    });
    expect(request).toEqual({
      to: { target: { kind: "list", slug: "spares001" } },
      name: "rin.trades",
      startList: "spares001",
      matches: { partnerId: "u-rin", post: "spares001" },
    });
  });

  test("a bare post key still reads as that post's matches", () => {
    const search = offerSearchSchema.parse({ post: "spares001" });
    expect(requestOf(search, partner).matches).toEqual({ partnerId: "u-rin", post: "spares001" });
  });

  test("a near pick rides with the post's matches", () => {
    const { request } = roundTrip({
      handle: "rin.trades",
      to: { list: "spares001" },
      matches: { post: "spares001", list: "mywants1" },
      near: "artms-seoyeon-204z",
    });
    expect(request.matches).toEqual({ partnerId: "u-rin", post: "spares001", list: "mywants1" });
    expect(request.addNear).toBe("artms-seoyeon-204z");
  });

  test("chat with a post card adds that post's matches", () => {
    const { request } = roundTrip({
      handle: "rin.trades",
      to: { conversation: 42 },
      matches: { post: "doubles01" },
      startList: "doubles01",
      from: "/messages/42?box=requests",
    });
    expect(request).toEqual({
      to: { conversationId: 42 },
      name: "rin.trades",
      startList: "doubles01",
      matches: { partnerId: "u-rin", post: "doubles01" },
    });
  });

  test("chat without a post card, or the trade page, is a bare conversation", () => {
    const { request } = roundTrip({ handle: "rin.trades", to: { conversation: 42 } });
    expect(request).toEqual({ to: { conversationId: 42 }, name: "rin.trades" });
  });

  test("with no address it is addressed to the person", () => {
    const { request } = roundTrip({ handle: "rin.trades" });
    expect(request.to).toEqual({ target: { kind: "user", userId: "u-rin" } });
  });

  test("a counter carries the offer id and its conversation", () => {
    const { search, request } = roundTrip({
      handle: "rin.trades",
      to: { conversation: 42 },
      counter: 881,
    });
    expect(search.counter).toBe(881);
    expect(request).toEqual({ to: { conversationId: 42 }, name: "rin.trades", counter: 881 });
  });

  test("a Market listing asks for its one objekt from its sale list", () => {
    const { request } = roundTrip({
      handle: "rin.trades",
      to: { list: "spares001" },
      startList: "spares001",
      ask: { collectionSlug: "artms-seoyeon-204z", objektId: "8812", serial: 537 },
    });
    expect(request).toEqual({
      to: { target: { kind: "list", slug: "spares001" } },
      name: "rin.trades",
      startList: "spares001",
      prefill: {
        get: [
          {
            key: "8812",
            collectionSlug: "artms-seoyeon-204z",
            objektId: "8812",
            serial: 537,
            listSlug: "spares001",
            flags: null,
          },
        ],
      },
    });
  });

  test("a Market listing that hides serials asks for any copy", () => {
    const { request } = roundTrip({
      handle: "rin.trades",
      to: { list: "spares001" },
      startList: "spares001",
      ask: { collectionSlug: "artms-seoyeon-204z", objektId: null, serial: null },
    });
    expect(request.prefill?.get).toEqual([
      {
        key: anyKey("artms-seoyeon-204z"),
        collectionSlug: "artms-seoyeon-204z",
        objektId: null,
        serial: null,
        listSlug: "spares001",
        flags: null,
      },
    ]);
  });

  test("ids the URL parser read as numbers come back as strings", () => {
    const search = offerSearchSchema.parse({ to: 123456789, ask: "c", objekt: 8812 });
    expect(search.to).toBe("123456789");
    expect(search.objekt).toBe("8812");
  });

  test("empty and false values stay out of the URL", () => {
    const { link } = roundTrip({
      handle: "rin.trades",
      to: { list: "doubles01" },
      matches: { mutual: false },
    });
    expect(link.search).toEqual({ to: "doubles01", match: "row" });
  });
});

describe("from", () => {
  test("keeps a same-origin path", () => {
    const { search } = roundTrip({ handle: "rin.trades", from: "/trade?list=abc" });
    expect(search.from).toBe("/trade?list=abc");
  });

  test("drops an outside or protocol-relative address", () => {
    for (const from of [
      "https://evil.example/",
      "//evil.example/x",
      "/\\evil.example",
      "javascript:alert(1)",
    ]) {
      expect(offerLink({ handle: "rin.trades", from }).search.from).toBeUndefined();
      expect(offerSearchSchema.parse({ from }).from).toBeUndefined();
    }
  });

  test("Back goes to from, else to the person's page", () => {
    expect(backPath("/messages/42?box=requests", "rin.trades")).toBe("/messages/42?box=requests");
    expect(backPath(undefined, "rin.trades")).toBe("/trade/@rin.trades");
    expect(backPath("//evil.example", "0xabc")).toBe("/trade/@0xabc");
  });
});

describe("partnerHandle", () => {
  test("a post card's handle wins", () => {
    expect(partnerHandle({ address: "0xABC", nickname: "rin" }, "rin.trades")).toBe("rin.trades");
  });

  test("else the address, which no one else can share", () => {
    expect(partnerHandle({ address: "0xABC", nickname: "rin" })).toBe("0xabc");
  });

  test("else the nickname, else nothing", () => {
    expect(partnerHandle({ address: null, nickname: "rin" })).toBe("rin");
    expect(partnerHandle({ address: null, nickname: null })).toBeNull();
  });
});

describe("a counter's start", () => {
  test("comes from the offer as the viewer sees it", () => {
    const offer = fromPartial<OfferView>({
      id: 881,
      conversationId: 42,
      give: [],
      get: [],
      topup: null,
      note: "theirs",
    });
    const request = counterRequest(offer, "rin.trades", {});
    expect(request.to).toEqual({ conversationId: 42 });
    expect(request.counter).toBe(offer.id);
  });
});

describe("lists a URL names", () => {
  test("are each listed once", () => {
    const search = offerSearchSchema.parse({ to: "a", post: "a", start: "b", list: "mine" });
    expect(listSlugsOf(search)).toEqual(["a", "b"]);
  });

  test("someone else's lists drop out, and the offer starts from the person", () => {
    const search = offerSearchSchema.parse({
      to: "theirs",
      match: "post",
      post: "theirs",
      start: "theirs",
      near: "c",
      ask: "c",
      objekt: "1",
      serial: 2,
      list: "mine",
      mutual: true,
      from: "/trade",
    });
    const request = requestOf(withoutLists(search), partner);
    expect(request).toEqual({
      to: { target: { kind: "user", userId: "u-rin" } },
      name: "rin.trades",
    });
    expect(withoutLists(search).from).toBe("/trade");
  });
});
