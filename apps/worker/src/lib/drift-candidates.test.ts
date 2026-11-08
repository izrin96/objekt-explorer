import { describe, expect, test } from "bun:test";

import { driftCandidates, onlyTriedTokens } from "./drift-candidates";

const ranges = [
  { collectionId: "a", start: 100, end: 199 },
  { collectionId: "b", start: 201, end: 300 },
  { collectionId: "c", start: 500, end: 899 },
];

const of = (map: Map<string, number[]>) => Object.fromEntries(map);

describe("driftCandidates", () => {
  test("another collection's token inside a range makes it a candidate", () => {
    expect(of(driftCandidates([{ id: 150, collectionId: "b" }], ranges))).toEqual({ a: [150] });
  });

  test("a token at a range's start or end counts as inside", () => {
    expect(of(driftCandidates([{ id: 100, collectionId: "x" }], ranges))).toEqual({ a: [100] });
    expect(of(driftCandidates([{ id: 300, collectionId: "x" }], ranges))).toEqual({ b: [300] });
  });

  test("a token outside every range, or between two, makes none", () => {
    expect(driftCandidates([{ id: 99, collectionId: "x" }], ranges).size).toBe(0);
    expect(driftCandidates([{ id: 200, collectionId: "x" }], ranges).size).toBe(0);
    expect(driftCandidates([{ id: 900, collectionId: "x" }], ranges).size).toBe(0);
  });

  test("a token inside its own collection's range makes none", () => {
    expect(driftCandidates([{ id: 150, collectionId: "a" }], ranges).size).toBe(0);
  });

  test("a token with no collection yet makes none", () => {
    expect(driftCandidates([{ id: 600, collectionId: null }], ranges).size).toBe(0);
  });

  test("ranges in any order give the same answer", () => {
    const shuffled = [ranges[2]!, ranges[0]!, ranges[1]!];
    expect(of(driftCandidates([{ id: 250, collectionId: "x" }], shuffled))).toEqual({ b: [250] });
  });

  test("every owner of overlapping ranges is found, even past a gap", () => {
    const overlapping = [
      { collectionId: "long", start: 0, end: 1000 },
      { collectionId: "short", start: 10, end: 20 },
      { collectionId: "near", start: 30, end: 60 },
    ];
    expect(of(driftCandidates([{ id: 50, collectionId: "x" }], overlapping))).toEqual({
      long: [50],
      near: [50],
    });
  });

  test("a token in its own range and an overlapping foreign one flags only the other", () => {
    const overlapping = [
      { collectionId: "own", start: 100, end: 200 },
      { collectionId: "other", start: 150, end: 250 },
    ];
    expect(of(driftCandidates([{ id: 160, collectionId: "own" }], overlapping))).toEqual({
      other: [160],
    });
  });

  test("a long range is found past a shorter one that ends before the token", () => {
    // stopping the walk at "early" (ending before 600) would miss "late"
    const layout = [
      { collectionId: "late", start: 0, end: 700 },
      { collectionId: "early", start: 10, end: 20 },
      { collectionId: "c", start: 500, end: 899 },
    ];
    expect(of(driftCandidates([{ id: 600, collectionId: "x" }], layout))).toEqual({
      late: [600],
      c: [600],
    });
    expect(of(driftCandidates([{ id: 600, collectionId: "x" }], ranges))).toEqual({ c: [600] });
  });

  test("a candidate gathers each of its foreign tokens once, in order", () => {
    const tokens = [
      { id: 520, collectionId: "y" },
      { id: 510, collectionId: "x" },
      { id: 520, collectionId: "y" },
    ];
    expect(of(driftCandidates(tokens, ranges))).toEqual({ c: [510, 520] });
  });

  test("empty inputs give none", () => {
    expect(driftCandidates([], ranges).size).toBe(0);
    expect(driftCandidates([{ id: 150, collectionId: "b" }], []).size).toBe(0);
  });
});

describe("onlyTriedTokens", () => {
  const tried = new Set([510, 520]);

  test("the same tokens, or fewer after one aged out, were already tried", () => {
    expect(onlyTriedTokens([510, 520], tried)).toBe(true);
    expect(onlyTriedTokens([520], tried)).toBe(true);
  });

  test("a new token brings the candidate back", () => {
    expect(onlyTriedTokens([510, 530], tried)).toBe(false);
  });
});
