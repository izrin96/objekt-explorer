import { describe, expect, test } from "bun:test";

import type { SummaryObjekt } from "@repo/cosmo/session-parse";

import { type IndexerObjekt, observationsOf, serialEligible } from "./cosmo-objekts";

const ME = "0x1111111111111111111111111111111111111111";
const OTHER = "0x3333333333333333333333333333333333333333";
const POST = "2026-07-01T00:00:00Z";
const PRE = "2026-01-01T00:00:00Z";
const NOW = "2026-11-17T00:00:00.000Z";

const objekt = (tokenId: string, extra: Partial<SummaryObjekt> = {}): SummaryObjekt => ({
  tokenId,
  objektNo: 5,
  collectionId: "Summer26 SeoYeon 101Z",
  transferable: true,
  nonTransferableReason: null,
  usedForGrid: false,
  owner: ME,
  status: "minted",
  ...extra,
});

const indexed = (extra: Partial<IndexerObjekt> = {}): IndexerObjekt => ({
  owner: ME,
  mintedAt: POST,
  slug: "summer26-seoyeon-101z",
  onOffline: "offline",
  ...extra,
});

const observe = (objekts: SummaryObjekt[], map: [string, IndexerObjekt][] = [], session = ME) =>
  observationsOf(objekts, session, new Map(map), 900, NOW);

describe("serialEligible", () => {
  const read = { slug: "summer26-seoyeon-101z" };

  test("null when the indexer lacks the token", () => {
    expect(serialEligible(read, undefined)).toBeNull();
    expect(serialEligible(read, null)).toBeNull();
  });

  test("true for an offline token minted after the cutoff", () => {
    expect(serialEligible(read, indexed())).toBe(true);
  });

  test("false when the indexer files it under another slug", () => {
    expect(serialEligible(read, indexed({ slug: "summer26-seoyeon-102z" }))).toBe(false);
  });

  test("false for an online collection", () => {
    expect(serialEligible(read, indexed({ onOffline: "online" }))).toBe(false);
  });

  test("true for a pre-assigned online collection", () => {
    const slug = "cream02-jiyeon-315z";
    expect(serialEligible({ slug }, indexed({ slug, onOffline: "online" }))).toBe(true);
  });

  test("false for a mint before the cutoff, accepting a Date", () => {
    expect(serialEligible(read, indexed({ mintedAt: PRE }))).toBe(false);
    expect(serialEligible(read, indexed({ mintedAt: new Date(POST) }))).toBe(true);
  });
});

describe("observationsOf", () => {
  test("keeps an eligible read with every field", () => {
    const { rows, skipped } = observe(
      [objekt("101", { nonTransferableReason: "challenge-reward", usedForGrid: true })],
      [["101", indexed()]],
    );
    expect(skipped).toEqual({ notMinted: 0, otherOwner: 0, holderMismatch: 0, duplicate: 0 });
    expect(rows).toEqual([
      {
        tokenId: "101",
        slug: "summer26-seoyeon-101z",
        objektNo: 5,
        transferable: true,
        nonTransferableReason: "challenge-reward",
        usedForGrid: true,
        serialEligible: true,
        chainHeight: 900,
        observedAt: NOW,
      },
    ]);
  });

  test("skips an entry that is not minted", () => {
    const { rows, skipped } = observe([objekt("1", { status: "pending" })]);
    expect(rows).toEqual([]);
    expect(skipped.notMinted).toBe(1);
  });

  test("skips another owner's entry", () => {
    const { rows, skipped } = observe([objekt("1", { owner: OTHER })]);
    expect(rows).toEqual([]);
    expect(skipped.otherOwner).toBe(1);
  });

  test("skips a token the indexer holds under another owner", () => {
    const { rows, skipped } = observe([objekt("1")], [["1", indexed({ owner: OTHER })]]);
    expect(rows).toEqual([]);
    expect(skipped.holderMismatch).toBe(1);
  });

  test("keeps a token the indexer lacks, unjudged", () => {
    const { rows, skipped } = observe([objekt("1")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.serialEligible).toBeNull();
    expect(skipped.holderMismatch).toBe(0);
  });

  test("of two entries with one token the later wins", () => {
    const { rows, skipped } = observe([
      objekt("1", { objektNo: 5 }),
      objekt("2"),
      objekt("1", { objektNo: 6 }),
    ]);
    expect(skipped.duplicate).toBe(1);
    expect(rows.map((r) => [r.tokenId, r.objektNo])).toEqual([
      ["2", 5],
      ["1", 6],
    ]);
  });

  test("compares addresses in lower case on both sides", () => {
    const upper = `0x${ME.slice(2).toUpperCase()}`;
    const { rows } = observe([objekt("1")], [["1", indexed({ owner: ME })]], upper);
    expect(rows).toHaveLength(1);
  });

  test("an online collection's read is judged not eligible", () => {
    const { rows } = observe([objekt("1")], [["1", indexed({ onOffline: "online" })]]);
    expect(rows[0]?.serialEligible).toBe(false);
  });

  test("a read whose collection differs from the indexer's is not eligible", () => {
    const { rows } = observe([objekt("1")], [["1", indexed({ slug: "other-101z" })]]);
    expect(rows[0]?.serialEligible).toBe(false);
  });

  test("maps a real-shaped collectionId to the indexer's slug", () => {
    const { rows } = observe([objekt("1", { collectionId: "Atom02 YooYeon 301Z" })]);
    expect(rows[0]?.slug).toBe("atom02-yooyeon-301z");
  });
});
