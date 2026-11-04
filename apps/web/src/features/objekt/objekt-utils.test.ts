import { describe, expect, test } from "bun:test";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { fromPartial } from "@total-typescript/shoehorn";

import { mapObjektWithTag } from "./objekt-utils";

function objekt(extra: Partial<ValidObjekt>): ValidObjekt {
  return fromPartial({
    artist: "triples",
    member: "Kaede",
    members: ["Kaede"],
    season: "Atom01",
    class: "First",
    collectionNo: "201Z",
    ...extra,
  });
}

describe("mapObjektWithTag", () => {
  test("a member carries every alias, in the table's order", () => {
    const { tags } = mapObjektWithTag(objekt({}));
    expect(tags).toContain("kaede");
    expect(tags.filter((tag) => tag === "k" || tag === "kd")).toEqual(["k", "kd"]);
  });

  test("a unit objekt carries the aliases of each member", () => {
    const { tags } = mapObjektWithTag(objekt({ member: "a X b", members: ["SeoYeon", "JiWoo"] }));
    expect(tags).toEqual(expect.arrayContaining(["sy", "ham", "jw"]));
  });
});
