import { describe, expect, test } from "bun:test";

import type { CandidateItem } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { fromPartial } from "@total-typescript/shoehorn";

import { candidateMatcher } from "./candidate-match";

const collections = {
  a201z: fromPartial<ValidObjekt>({
    artist: "triples",
    member: "Kaede",
    members: ["Kaede"],
    season: "Atom01",
    class: "First",
    collectionNo: "201Z",
  }),
};
const item = (overrides: Partial<CandidateItem> = {}) =>
  fromPartial<CandidateItem>({ collectionSlug: "a201z", serial: 722, ...overrides });

describe("candidateMatcher", () => {
  test("an empty search matches everything, so there is no matcher", () => {
    expect(candidateMatcher("  ", collections)).toBeNull();
  });

  test("reads the collection's tags", () => {
    const matches = candidateMatcher("kaede", collections);
    expect(matches?.(item())).toBe(true);
    expect(candidateMatcher("seoyeon", collections)?.(item())).toBe(false);
  });

  test("an item whose collection is not loaded never matches", () => {
    expect(candidateMatcher("kaede", collections)?.(item({ collectionSlug: "other" }))).toBe(false);
  });

  test("a serial term reads the item's serial, and an unnumbered item has none", () => {
    expect(candidateMatcher("#700-800", collections)?.(item())).toBe(true);
    expect(candidateMatcher("#1-5", collections)?.(item())).toBe(false);
    expect(candidateMatcher("#700-800", collections)?.(item({ serial: null }))).toBe(false);
  });
});
