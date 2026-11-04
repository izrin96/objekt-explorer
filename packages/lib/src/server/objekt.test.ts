import { describe, expect, test } from "bun:test";

import { type CollectionOverrides, mapOwnedObjekt, overrideCollection } from "./objekt";

const collection = {
  id: "c0ffee",
  createdAt: "2026-01-01T00:00:00.000Z",
  slug: "atom01-heejin-322z",
  collectionId: "322z",
  season: "Atom01",
  member: "HeeJin",
  members: ["HeeJin"],
  artist: "artms",
  collectionNo: "322Z",
  class: "Special",
  thumbnailImage: "thumb",
  frontImage: "front",
  backImage: "back",
  backgroundColor: "#000000",
  textColor: "#000000",
  onOffline: "online",
  bandImageUrl: null,
  frontMedia: null,
  hasAudio: false,
  processedThumbnailImage: null,
  processedFrontImage: null,
  processedBackImage: null,
} as unknown as Parameters<typeof overrideCollection>[0];

const none: CollectionOverrides = new Map();

describe("overrideCollection", () => {
  test("a text-only override replaces the text colour and keeps the source background", () => {
    const overrides: CollectionOverrides = new Map([
      ["atom01-heejin-322z", { textColor: "#ffffff" }],
    ]);
    const result = overrideCollection(collection, overrides);
    expect(result.textColor).toBe("#ffffff");
    expect(result.backgroundColor).toBe("#000000");
  });

  test("a background-only override replaces the background and keeps the source text", () => {
    const overrides: CollectionOverrides = new Map([
      ["atom01-heejin-322z", { backgroundColor: "#b400ff" }],
    ]);
    const result = overrideCollection(collection, overrides);
    expect(result.backgroundColor).toBe("#b400ff");
    expect(result.textColor).toBe("#000000");
  });

  test("an override of both colours replaces both", () => {
    const overrides: CollectionOverrides = new Map([
      ["atom01-heejin-322z", { textColor: "#ffffff", backgroundColor: "#07328d" }],
    ]);
    const result = overrideCollection(collection, overrides);
    expect(result.textColor).toBe("#ffffff");
    expect(result.backgroundColor).toBe("#07328d");
  });

  test("a collection with no override keeps the source colours", () => {
    const result = overrideCollection(collection, none);
    expect(result.textColor).toBe("#000000");
    expect(result.backgroundColor).toBe("#000000");
  });

  test("an override for another slug changes nothing", () => {
    const overrides: CollectionOverrides = new Map([
      ["atom01-heejin-323z", { textColor: "#ffffff" }],
    ]);
    expect(overrideCollection(collection, overrides).textColor).toBe("#000000");
  });

  test("the band image reads the source background, not the override", () => {
    const idntt = {
      ...collection,
      slug: "idntt-offline",
      artist: "idntt",
      class: "First",
      onOffline: "offline",
      backgroundColor: "#000000",
    } as typeof collection;
    const overrides: CollectionOverrides = new Map([
      ["idntt-offline", { backgroundColor: "#ffffff" }],
    ]);
    const result = overrideCollection(idntt, overrides);
    expect(result.backgroundColor).toBe("#ffffff");
    expect(result.bandImageUrl).toContain("fab4f9ec98d24a00a7c417e012a493cd");
  });
});

describe("mapOwnedObjekt", () => {
  test("applies the overrides to an owned copy", () => {
    const objekt = {
      id: "42",
      serial: 7,
      receivedAt: "2026-02-01T00:00:00.000Z",
      mintedAt: "2026-01-01T00:00:00.000Z",
      transferable: true,
    } as unknown as Parameters<typeof mapOwnedObjekt>[0];
    const overrides: CollectionOverrides = new Map([
      ["atom01-heejin-322z", { textColor: "#ffffff" }],
    ]);
    const result = mapOwnedObjekt(objekt, collection, overrides);
    expect(result.textColor).toBe("#ffffff");
    expect(result.id).toBe("42");
    expect(result.serial).toBe(7);
  });
});
