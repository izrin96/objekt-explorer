import { describe, expect, test } from "bun:test";

import { stillWantedLines } from "./still-wanted-lines";

const KEEPERS = { slug: "keep1", name: "keepers" };
const HUNT = { slug: "hunt1", name: "binary hunt" };

describe("stillWantedLines", () => {
  test("one line per collection and list", () => {
    expect(
      stillWantedLines([{ collectionSlug: "haseul-302z", wantedOn: [KEEPERS, HUNT] }]),
    ).toEqual([
      { collectionSlug: "haseul-302z", list: KEEPERS },
      { collectionSlug: "haseul-302z", list: HUNT },
    ]);
  });

  test("two copies of one collection make one line", () => {
    const leg = { collectionSlug: "haseul-302z", wantedOn: [KEEPERS] };
    expect(stillWantedLines([leg, leg])).toHaveLength(1);
  });

  test("a leg on no list, or from a server before the field, makes none", () => {
    expect(
      stillWantedLines([{ collectionSlug: "a", wantedOn: [] }, { collectionSlug: "b" }]),
    ).toEqual([]);
  });
});
