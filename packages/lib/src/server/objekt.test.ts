import { describe, expect, test } from "bun:test";

import { fromAny, fromPartial } from "@total-typescript/shoehorn";

import { mapOwnedObjekt, overrideCollection } from "./objekt";

const collection = fromPartial<Parameters<typeof overrideCollection>[0]>({
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
});

describe("overrideCollection", () => {
  test("carries the row's colours", () => {
    const result = overrideCollection({ ...collection, textColor: "#ffffff" });
    expect(result.textColor).toBe("#ffffff");
    expect(result.backgroundColor).toBe("#000000");
  });

  test("an idntt offline collection on black gets its band image", () => {
    const idntt = fromPartial<typeof collection>({
      ...collection,
      slug: "idntt-offline",
      artist: "idntt",
      class: "First",
      onOffline: "offline",
      backgroundColor: "#000000",
    });
    expect(overrideCollection(idntt).bandImageUrl).toContain("fab4f9ec98d24a00a7c417e012a493cd");
  });

  test("lists its fields, so no other column of the row is carried", () => {
    const row = fromAny<typeof collection, unknown>({ ...collection, sourceTextColor: "#000000" });
    expect(overrideCollection(row)).not.toHaveProperty("sourceTextColor");
  });
});

describe("mapOwnedObjekt", () => {
  test("takes the objekt's token id, serial and dates over the collection's", () => {
    const objekt = fromPartial<Parameters<typeof mapOwnedObjekt>[0]>({
      id: "42",
      serial: 7,
      receivedAt: "2026-02-01T00:00:00.000Z",
      mintedAt: "2026-01-01T00:00:00.000Z",
      transferable: true,
    });
    const result = mapOwnedObjekt(objekt, collection);
    expect(result.id).toBe("42");
    expect(result.tokenId).toBe("42");
    expect(result.serial).toBe(7);
    expect(result.receivedAt).toBe("2026-02-01T00:00:00.000Z");
  });
});
