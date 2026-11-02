import { describe, expect, test } from "bun:test";

import { type AddList, addObjektsRequest, addSourceOf } from "./add-objekts-request";

const noPrice = { price: null, isQyop: false, note: "" };
const have: AddList = { slug: "spares", listType: "have", isProfileBind: true };
const sale: AddList = { slug: "binary-sale", listType: "sale", isProfileBind: true };
const want: AddList = { slug: "binary-hunt", listType: "want", isProfileBind: false };

describe("addSourceOf", () => {
  test("a bound have or sale list draws on its profile", () => {
    expect(addSourceOf(have)).toBe("owned");
    expect(addSourceOf(sale)).toBe("owned");
  });

  test("a want list draws on the catalogue", () => {
    expect(addSourceOf(want)).toBe("collections");
    // a want list may carry a display profile, which is not a source
    expect(addSourceOf({ ...want, isProfileBind: true })).toBe("collections");
  });

  test("an unbound have or sale list has nothing to draw on", () => {
    expect(addSourceOf({ ...have, isProfileBind: false })).toBeNull();
    expect(addSourceOf({ ...sale, isProfileBind: false })).toBeNull();
  });

  test("a general list has nothing to draw on", () => {
    expect(addSourceOf({ slug: "g", listType: "general", isProfileBind: false })).toBeNull();
  });
});

describe("addObjektsRequest", () => {
  test("a have list sends token ids and skips duplicates", () => {
    expect(addObjektsRequest(have, ["101", "102"], noPrice)).toEqual({
      slug: "spares",
      skipDups: true,
      from: { type: "objekts", tokenIds: ["101", "102"] },
    });
  });

  test("a want list sends collection slugs", () => {
    expect(addObjektsRequest(want, ["lynn-sco", "seoyeon-204z"], noPrice)).toEqual({
      slug: "binary-hunt",
      skipDups: true,
      from: { type: "collections", slugs: ["lynn-sco", "seoyeon-204z"] },
    });
  });

  test("a want list ignores a price", () => {
    const request = addObjektsRequest(want, ["lynn-sco"], { price: 5, isQyop: false, note: "x" });
    expect(request).not.toHaveProperty("price");
    expect(request).not.toHaveProperty("isQyop");
    expect(request).not.toHaveProperty("note");
  });

  test("a have list ignores a price", () => {
    const request = addObjektsRequest(have, ["101"], { price: 5, isQyop: true, note: "x" });
    expect(request).not.toHaveProperty("price");
  });

  test("a sale list sends its price, QYOP and trimmed note", () => {
    expect(addObjektsRequest(sale, ["101"], { price: 5, isQyop: false, note: "  mint " })).toEqual({
      slug: "binary-sale",
      skipDups: true,
      from: { type: "objekts", tokenIds: ["101"] },
      price: 5,
      isQyop: false,
      note: "mint",
    });
  });

  test("a sale list with no price sends nulls, as Set price clears", () => {
    expect(addObjektsRequest(sale, ["101"], noPrice)).toMatchObject({
      price: null,
      isQyop: false,
      note: null,
    });
    expect(addObjektsRequest(sale, ["101"], { ...noPrice, price: 0 })).toMatchObject({
      price: null,
    });
  });

  test("QYOP carries no price", () => {
    expect(addObjektsRequest(sale, ["101"], { price: 5, isQyop: true, note: "" })).toMatchObject({
      price: null,
      isQyop: true,
    });
  });

  test("nothing ticked sends nothing", () => {
    expect(addObjektsRequest(have, [], noPrice)).toBeNull();
    expect(addObjektsRequest(want, [], noPrice)).toBeNull();
  });

  test("a list with no source sends nothing", () => {
    expect(addObjektsRequest({ ...have, isProfileBind: false }, ["101"], noPrice)).toBeNull();
  });
});
