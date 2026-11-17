import { describe, expect, test } from "bun:test";

import {
  UNRANKED,
  byCollectionNo,
  compareCollectionNo,
  cursorFor,
  memberRanks,
  rankOf,
} from "./picker-sort";

const roster = [
  {
    artistMembers: [
      { name: "SeoYeon", order: 1 },
      { name: "Jiwoo", order: 4 },
    ],
  },
  {
    artistMembers: [
      { name: "Nien", order: 2 },
      { name: "seoyeon", order: 9 },
    ],
  },
];

describe("memberRanks and rankOf", () => {
  test("keys by lowercased name, the last artist winning a clash", () => {
    const ranks = memberRanks(roster);
    expect(ranks.get("jiwoo")).toBe(4);
    expect(ranks.get("seoyeon")).toBe(9);
    expect(rankOf(ranks, "JiWoo")).toBe(4);
  });

  test("an unknown member is last", () => {
    expect(rankOf(memberRanks(roster), "Nobody")).toBe(UNRANKED);
  });
});

describe("compareCollectionNo", () => {
  test("101A < 101Z < 110Z < 201Z by code unit", () => {
    const sorted = ["201Z", "110Z", "101Z", "101A"].toSorted(compareCollectionNo);
    expect(sorted).toEqual(["101A", "101Z", "110Z", "201Z"]);
    expect(compareCollectionNo("101Z", "101Z")).toBe(0);
  });
});

describe("byCollectionNo", () => {
  type Item = { collectionSlug: string; objektId: string | null };
  const keys: Record<string, { no: string; rank: number }> = {
    "a-jiwoo-101z": { no: "101Z", rank: 4 },
    "a-seoyeon-101z": { no: "101Z", rank: 1 },
    "a-ghost-101z": { no: "101Z", rank: UNRANKED },
    "a-seoyeon-101a": { no: "101A", rank: 1 },
    "a-seoyeon-201z": { no: "201Z", rank: 1 },
    "atom01-seoyeon-101z": { no: "101Z", rank: 1 },
    "binary01-seoyeon-101z": { no: "101Z", rank: 1 },
  };
  const item = (collectionSlug: string, objektId: string | null = collectionSlug): Item => ({
    collectionSlug,
    objektId,
  });
  const order = (items: Item[]) => [
    ...new Set(byCollectionNo(items, (i) => keys[i.collectionSlug]).map((i) => i.collectionSlug)),
  ];

  test("orders by number, then roster order, an unknown member last", () => {
    const items = [
      "a-seoyeon-201z",
      "a-ghost-101z",
      "a-jiwoo-101z",
      "a-seoyeon-101z",
      "a-seoyeon-101a",
    ].map((s) => item(s));
    expect(order(items)).toEqual([
      "a-seoyeon-101a",
      "a-seoyeon-101z",
      "a-jiwoo-101z",
      "a-ghost-101z",
      "a-seoyeon-201z",
    ]);
  });

  test("a full tie keeps the input order", () => {
    expect(order([item("binary01-seoyeon-101z"), item("atom01-seoyeon-101z")])).toEqual([
      "binary01-seoyeon-101z",
      "atom01-seoyeon-101z",
    ]);
  });

  test("a collection's items stay in place, its any item first", () => {
    const items = [
      item("a-seoyeon-201z", null),
      item("a-seoyeon-201z", "2"),
      item("a-seoyeon-101a", null),
      item("a-seoyeon-101a", "1"),
    ];
    expect(byCollectionNo(items, (i) => keys[i.collectionSlug])).toEqual([
      items[2]!,
      items[3]!,
      items[0]!,
      items[1]!,
    ]);
  });
});

describe("cursorFor", () => {
  const newest = { receivedAt: "2026-10-17 00:00:00+00", id: "x" };
  const byNo = {
    sort: "collectionNo" as const,
    no: "101Z",
    rank: 1,
    receivedAt: "2026-10-17 00:00:00+00",
    slug: "x",
  };

  test("an absent cursor is undefined", () => {
    expect(cursorFor("default", undefined)).toBeUndefined();
    expect(cursorFor("collectionNo", undefined)).toBeUndefined();
  });

  test("a cursor of the other kind is undefined", () => {
    expect(cursorFor("collectionNo", newest)).toBeUndefined();
    expect(cursorFor("default", byNo)).toBeUndefined();
  });

  test("a matching cursor is returned", () => {
    expect(cursorFor("default", newest)).toBe(newest);
    expect(cursorFor("collectionNo", byNo)).toBe(byNo);
  });
});
