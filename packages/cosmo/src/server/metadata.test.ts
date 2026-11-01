import { describe, expect, test } from "bun:test";

import type { CosmoObjektMetadataV3 } from "../types/metadata";
import { getMembers, getTrait, normalizeV3 } from "./metadata";

function metadata(traits: [string, string][], name = "Cream 01 Seoyeon 101Z #12") {
  return {
    name,
    description: "",
    image: "https://imagedelivery.net/x/2x",
    background_color: "#ffffff",
    attributes: traits.map(([trait_type, value]) => ({ trait_type, value })),
  } satisfies CosmoObjektMetadataV3;
}

const single = metadata([
  ["Artist", "tripleS"],
  ["Class", "First"],
  ["Member", "SeoYeon"],
  ["Season", "Cream01"],
  ["Collection", "101Z"],
]);

// Cosmo lists the individual members first and the combined one last
const unit = metadata(
  [
    ["Artist", "idntt"],
    ["Class", "Unit"],
    ["Member", "id4"],
    ["Member", "id8"],
    ["Member", "id4 X id8"],
    ["Season", "Unit"],
    ["Collection", "201Z"],
  ],
  "Unit id4 X id8 201Z #3",
);

describe("getMembers", () => {
  test("a single member", () => {
    expect(getMembers(single)).toEqual(["SeoYeon"]);
  });

  test("a unit puts the combined member first, then each member", () => {
    expect(getMembers(unit)).toEqual(["id4 X id8", "id4", "id8"]);
  });

  test("members[0] is the member getTrait resolves", () => {
    for (const data of [single, unit]) {
      expect(getMembers(data)[0]).toBe(getTrait(data, "1", "Member"));
    }
  });

  test("a unit without a combined trait keeps Cosmo's order", () => {
    const partial = metadata([
      ["Class", "Unit"],
      ["Member", "id4"],
      ["Member", "id8"],
    ]);
    expect(getMembers(partial)).toEqual(["id4", "id8"]);
  });

  test("no member trait gives none", () => {
    expect(getMembers(metadata([["Class", "First"]]))).toEqual([]);
  });
});

describe("getTrait", () => {
  test("the last trait of that type", () => {
    expect(getTrait(unit, "1", "Collection")).toBe("201Z");
  });

  test("a unit's member is the combined one", () => {
    expect(getTrait(unit, "1", "Member")).toBe("id4 X id8");
  });

  test("a missing trait throws", () => {
    expect(() => getTrait(metadata([]), "7", "Season")).toThrow("Trait Season not found");
  });
});

describe("normalizeV3", () => {
  test("maps the traits onto the v1 shape", () => {
    const { objekt } = normalizeV3(single, "12");
    expect(objekt).toMatchObject({
      collectionId: "Cream 01 Seoyeon 101Z",
      season: "Cream01",
      member: "SeoYeon",
      members: ["SeoYeon"],
      collectionNo: "101Z",
      class: "First",
      artists: ["tripleS"],
      thumbnailImage: "https://imagedelivery.net/x/thumbnail",
      comoAmount: 1,
      textColor: "#000000",
      transferable: true,
      tokenId: "12",
    });
  });

  test("a unit keeps its combined member and every member", () => {
    const { objekt } = normalizeV3(unit, "3");
    expect(objekt.member).toBe("id4 X id8");
    expect(objekt.members).toEqual(["id4 X id8", "id4", "id8"]);
    expect(objekt.textColor).toBe("#000000");
  });

  test("como amount and transferable follow the class", () => {
    const withClass = (className: string) =>
      normalizeV3(
        metadata([
          ["Artist", "tripleS"],
          ["Class", className],
          ["Member", "SeoYeon"],
          ["Season", "Cream01"],
          ["Collection", "301Z"],
        ]),
        "1",
      ).objekt;
    expect(withClass("Motion").comoAmount).toBe(3);
    expect(withClass("Double").comoAmount).toBe(2);
    expect(withClass("Premier").comoAmount).toBe(2);
    expect(withClass("Special").comoAmount).toBe(1);
    expect(withClass("Welcome").transferable).toBe(false);
    expect(withClass("Double").textColor).toBe("#ffffff");
  });
});
