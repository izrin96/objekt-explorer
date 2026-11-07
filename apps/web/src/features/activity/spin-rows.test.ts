import { describe, expect, test } from "bun:test";

import { Addresses } from "@repo/lib";

import { foldSpinRows, type SpinRow } from "./spin-rows";

const WALLET = "0x00000000000000000000000000000000000000aa";
const T0 = Date.parse("2026-11-07T12:00:00Z");
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();

type Row = SpinRow<{ name: string }>;

const spin = (id: string, s: number, extra: Partial<Row> = {}): Row => ({
  transfer: { id, from: WALLET, to: Addresses.SPIN, timestamp: iso(s) },
  objekt: { name: id },
  spin: { outcome: "pending" },
  ...extra,
});
const mint = (id: string, s: number, rewardOf?: string): Row => ({
  transfer: { id, from: Addresses.NULL, to: WALLET, timestamp: iso(s) },
  objekt: { name: id },
  ...(rewardOf && { rewardOf }),
});
const reward = (m: Row) => ({ transfer: m.transfer, objekt: m.objekt });

const ids = (rows: Row[]) => rows.map((row) => row.transfer.id);

describe("foldSpinRows", () => {
  const r = mint("r", 15, "s");
  const s = spin("s", 0, { spin: { outcome: "reward", reward: reward(r) } });
  const other = mint("m", 20);

  test("All drops a reward row and keeps its spin", () => {
    expect(ids(foldSpinRows([other, r, s], { all: true, faceted: false }))).toEqual(["m", "s"]);
  });

  test("All drops a reward whose spin sits on a later page", () => {
    expect(ids(foldSpinRows([r], { all: true, faceted: false }))).toEqual([]);
  });

  test("Mint keeps the reward as a mint row", () => {
    expect(ids(foldSpinRows([other, r], { all: false, faceted: false }))).toEqual(["m", "r"]);
  });

  test("Spin keeps the spin with its reward", () => {
    const [row] = foldSpinRows([s], { all: false, faceted: false });
    expect(row?.spin?.reward?.transfer.id).toBe("r");
  });

  test("with facets, a reward whose spin is not listed stays a mint row", () => {
    expect(ids(foldSpinRows([r], { all: true, faceted: true }))).toEqual(["r"]);
    expect(ids(foldSpinRows([r, s], { all: true, faceted: true }))).toEqual(["s"]);
  });

  test("a reward paired in the browser fills a pending spin and leaves All", () => {
    const live = mint("live", 30);
    const pending = spin("p", 10);
    const rewards = new Map([["p", reward(live)]]);
    const all = foldSpinRows([live, pending], { all: true, faceted: false, rewards });
    expect(ids(all)).toEqual(["p"]);
    expect(all[0]?.spin).toEqual({ outcome: "reward", reward: reward(live) });
    expect(ids(foldSpinRows([live, pending], { all: false, faceted: false, rewards }))).toEqual([
      "live",
      "p",
    ]);
  });

  test("a reward its listed spin does not show stays its own row", () => {
    // two pages paired a chain differently: the spin shows another mint
    const shown = mint("x", 40);
    const spinShowsX = spin("s", 0, { spin: { outcome: "reward", reward: reward(shown) } });
    expect(ids(foldSpinRows([r, spinShowsX], { all: true, faceted: false }))).toEqual(["r", "s"]);
  });

  test("a mint any drawn spin shows is folded, whatever its rewardOf says", () => {
    const loose = mint("r", 15);
    expect(ids(foldSpinRows([loose, s], { all: true, faceted: false }))).toEqual(["s"]);
  });

  test("a pending spin past the window by the clock reads as broke", () => {
    const pending = spin("p", 0);
    const at = (s: number) =>
      foldSpinRows([pending], { all: true, faceted: false, clock: T0 + s * 1000 })[0]?.spin;
    expect(at(60)).toEqual({ outcome: "pending" });
    expect(at(601)).toEqual({ outcome: "broke" });
  });
});
