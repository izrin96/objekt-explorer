import { describe, expect, test } from "bun:test";

import type { CosmoObjektMetadataV1 } from "@repo/cosmo/types/metadata";

import { collectionChanged, collectionFields, type CollectionFields } from "./collection-fields";

const metadata = {
  objekt: {
    season: "Atom01",
    member: "SeoYeon",
    artists: ["tripleS"],
    collectionNo: "101Z",
    class: "First",
    comoAmount: 1,
    thumbnailImage: "https://example.com/thumb.png",
    frontImage: "https://example.com/front.png",
  },
} as unknown as CosmoObjektMetadataV1;

const fields: CollectionFields = collectionFields(metadata);

describe("collectionFields", () => {
  test("derives the artist, members and online flag", () => {
    expect(fields.artist).toBe("triples");
    expect(fields.members).toEqual(["SeoYeon"]);
    expect(fields.onOffline).toBe("online");
  });

  test("an offline collection number is offline", () => {
    const offline = {
      objekt: { ...metadata.objekt, collectionNo: "101A" },
    } as CosmoObjektMetadataV1;
    expect(collectionFields(offline).onOffline).toBe("offline");
  });
});

describe("collectionChanged", () => {
  test("the same metadata changes nothing", () => {
    expect(collectionChanged({ ...fields, members: [...fields.members] }, fields)).toBe(false);
  });

  test("a new image is a change", () => {
    expect(
      collectionChanged(fields, { ...fields, frontImage: "https://example.com/new.png" }),
    ).toBe(true);
  });

  test("a new member list is a change", () => {
    expect(collectionChanged(fields, { ...fields, members: ["SeoYeon", "HyeRin"] })).toBe(true);
    expect(collectionChanged(fields, { ...fields, members: ["HyeRin"] })).toBe(true);
  });

  test("a new como amount is a change", () => {
    expect(collectionChanged(fields, { ...fields, comoAmount: 2 })).toBe(true);
  });
});
