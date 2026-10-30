import { describe, expect, test } from "bun:test";

import type { OfferPick } from "@/features/offers/pick";

import { addedKeys, matchesLine } from "./matches";
import type { AddedMatches } from "./types";

const pick = (key: string): OfferPick => ({
  key,
  collectionSlug: "atom01-heejin-101z",
  objektId: key,
  serial: null,
  listSlug: null,
  flags: null,
});

const added = (give: string[], get: string[]): AddedMatches => ({
  keys: { give, get },
  matched: { give: give.length, get: get.length },
  postName: null,
  near: [],
  nearKeys: { give: [], get: [] },
});

const NO_NEAR = { give: [], get: [] };

describe("addedKeys", () => {
  test("unions the match keys and the near keys per side", () => {
    const keys = addedKeys(added(["a"], ["b"]), { give: ["n1"], get: ["n2", "b"] });
    expect([...keys.give]).toEqual(["a", "n1"]);
    expect([...keys.get]).toEqual(["b", "n2"]);
  });

  test("reads near keys alone when nothing was added", () => {
    const keys = addedKeys(undefined, { give: ["n1"], get: [] });
    expect([...keys.give]).toEqual(["n1"]);
    expect(keys.get.size).toBe(0);
  });
});

describe("matchesLine", () => {
  test("no added gives null", () => {
    const line = matchesLine({
      added: undefined,
      nearKeys: NO_NEAR,
      give: [pick("a")],
      get: [],
      removed: null,
    });
    expect(line).toBeNull();
  });

  test("added with no match keys and no near keys gives null", () => {
    const line = matchesLine({
      added: added([], []),
      nearKeys: NO_NEAR,
      give: [pick("a")],
      get: [pick("b")],
      removed: null,
    });
    expect(line).toBeNull();
  });

  test("a match still on a side shows the line with its keys intact", () => {
    const base = added(["a"], ["b"]);
    const line = matchesLine({
      added: base,
      nearKeys: NO_NEAR,
      give: [pick("a")],
      get: [],
      removed: null,
    });
    expect(line?.added).toBe(base);
    expect(line?.nearPicks).toEqual([]);
    expect(line?.taken).toBeNull();
    expect(line?.takenNear).toBeNull();
  });

  test("all matches taken out by hand with a near pick held shows the line with cleared keys", () => {
    const near = pick("n");
    const line = matchesLine({
      added: added(["a"], ["b"]),
      nearKeys: { give: ["n"], get: [] },
      give: [near],
      get: [],
      removed: null,
    });
    expect(line?.added.keys).toEqual({ give: [], get: [] });
    expect(line?.added.matched).toEqual({ give: 1, get: 1 });
    expect(line?.nearPicks).toEqual([near]);
  });

  test("every added pick taken out by hand gives null", () => {
    const line = matchesLine({
      added: added(["a"], ["b"]),
      nearKeys: { give: ["n"], get: [] },
      give: [pick("other")],
      get: [],
      removed: null,
    });
    expect(line).toBeNull();
  });

  test("after Remove the line shows, counting only matches and listing the near picks", () => {
    const near = pick("n");
    const line = matchesLine({
      added: added(["a"], ["b"]),
      nearKeys: { give: ["n"], get: [] },
      give: [],
      get: [],
      removed: { give: [pick("a"), near], get: [pick("b")] },
    });
    expect(line?.taken).toBe(2);
    expect(line?.takenNear).toEqual([near]);
    expect(line?.nearPicks).toEqual([]);
    expect(line?.added.keys).toEqual({ give: ["a"], get: ["b"] });
  });

  test("after Remove with no near picks taken, takenNear is null", () => {
    const line = matchesLine({
      added: added(["a"], []),
      nearKeys: NO_NEAR,
      give: [],
      get: [],
      removed: { give: [pick("a")], get: [] },
    });
    expect(line?.taken).toBe(1);
    expect(line?.takenNear).toBeNull();
  });

  test("a near-only builder holding a near pick shows the line", () => {
    const near = pick("n");
    const line = matchesLine({
      added: added([], []),
      nearKeys: { give: [], get: ["n"] },
      give: [],
      get: [near],
      removed: null,
    });
    expect(line?.nearPicks).toEqual([near]);
    expect(line?.added.keys).toEqual({ give: [], get: [] });
  });
});
