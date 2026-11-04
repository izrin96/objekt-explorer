import { describe, expect, test } from "bun:test";

import {
  BASE_MARGIN_MS,
  FULL_COUNT_EVERY_MS,
  mergeRarity,
  needsFullCount,
  readBase,
} from "./rarity-counts";

const AT = "2026-11-04T00:00:00.000Z";
const atMs = Date.parse(AT);

describe("readBase", () => {
  test("reads a stored base", () => {
    const base = { at: AT, counts: [{ slug: "a", count: 3 }] };
    expect(readBase(JSON.stringify(base))).toEqual(base);
  });

  test("a missing base is null", () => {
    expect(readBase(null)).toBeNull();
  });

  test("unreadable JSON is null", () => {
    expect(readBase("{")).toBeNull();
  });

  test("a base without a valid cutoff or counts is null", () => {
    expect(readBase(JSON.stringify({ at: "soon", counts: [] }))).toBeNull();
    expect(readBase(JSON.stringify({ at: AT }))).toBeNull();
    expect(readBase(JSON.stringify([1]))).toBeNull();
    expect(readBase("null")).toBeNull();
  });
});

describe("needsFullCount", () => {
  const base = { at: AT, counts: [] };
  // the cutoff is BASE_MARGIN_MS before the full count ran
  const ranMs = atMs + BASE_MARGIN_MS;

  test("no base needs a full count", () => {
    expect(needsFullCount(null, ranMs)).toBe(true);
  });

  test("a base counted an hour ago is kept", () => {
    expect(needsFullCount(base, ranMs + 60 * 60 * 1000)).toBe(false);
  });

  test("a base counted a day ago needs a full count", () => {
    expect(needsFullCount(base, ranMs + FULL_COUNT_EVERY_MS)).toBe(true);
  });
});

describe("mergeRarity", () => {
  test("adds the recent mints to the base", () => {
    expect(
      mergeRarity(
        [
          { slug: "a", count: 10 },
          { slug: "b", count: 5 },
        ],
        [
          { slug: "a", count: 2 },
          { slug: "c", count: 4 },
        ],
      ),
    ).toEqual([
      { slug: "a", count: 12 },
      { slug: "b", count: 5 },
      { slug: "c", count: 4 },
    ]);
  });

  test("no recent mints leaves the base as it is", () => {
    expect(mergeRarity([{ slug: "a", count: 1 }], [])).toEqual([{ slug: "a", count: 1 }]);
  });
});
