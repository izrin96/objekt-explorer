import { describe, expect, test } from "bun:test";

import { Addresses } from "@repo/lib";

import {
  type CheckedObjekt,
  type Tally,
  addToTally,
  compareWithChain,
  decodeAggregate3,
  encodeAggregate3,
} from "./transferability-check";

// encoded independently of this module; the node accepted this call on 2026-11-11
const ENCODED_TWO =
  "0x82ad56cb" +
  "0000000000000000000000000000000000000000000000000000000000000020" +
  "0000000000000000000000000000000000000000000000000000000000000002" +
  "0000000000000000000000000000000000000000000000000000000000000040" +
  "0000000000000000000000000000000000000000000000000000000000000100" +
  "00000000000000000000000099bb83ae9bb0c0a6be865cacf67760947f91cb70" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000060" +
  "0000000000000000000000000000000000000000000000000000000000000024" +
  "b2c03a500000000000000000000000000000000000000000000000000000000001d81759" +
  "00000000000000000000000000000000000000000000000000000000" +
  "00000000000000000000000099bb83ae9bb0c0a6be865cacf67760947f91cb70" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000060" +
  "0000000000000000000000000000000000000000000000000000000000000024" +
  "b2c03a500000000000000000000000000000000000000000000000000000000001d8175a" +
  "00000000000000000000000000000000000000000000000000000000";

// what the node returned for ENCODED_TWO at block 89,019,706: both calls succeed with false
const NODE_RESULT =
  "0x" +
  "0000000000000000000000000000000000000000000000000000000000000020" +
  "0000000000000000000000000000000000000000000000000000000000000002" +
  "0000000000000000000000000000000000000000000000000000000000000040" +
  "00000000000000000000000000000000000000000000000000000000000000c0" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000040" +
  "0000000000000000000000000000000000000000000000000000000000000020" +
  "0000000000000000000000000000000000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000040" +
  "0000000000000000000000000000000000000000000000000000000000000020" +
  "0000000000000000000000000000000000000000000000000000000000000000";

const w = (n: number) => n.toString(16).padStart(64, "0");

/** An aggregate3 return built by hand from `(success, returnData)` pairs. */
function aggregateReturn(entries: [success: boolean, data: string][]) {
  const bodies = entries.map(([success, data]) => {
    const hex = data.slice(2);
    return `${w(success ? 1 : 0)}${w(64)}${w(hex.length / 2)}${hex.padEnd(Math.ceil(hex.length / 64) * 64, "0")}`;
  });
  let offset = entries.length * 32;
  const heads = bodies.map((body) => {
    const head = w(offset);
    offset += body.length / 2;
    return head;
  });
  return `0x${w(32)}${w(entries.length)}${heads.join("")}${bodies.join("")}`;
}

describe("encodeAggregate3", () => {
  test("matches an independently encoded call", () => {
    expect(encodeAggregate3(Addresses.OBJEKT, ["30938969", "30938970"])).toBe(ENCODED_TWO);
  });

  test("an empty page is an empty array", () => {
    expect(encodeAggregate3(Addresses.OBJEKT, [])).toBe(`0x82ad56cb${w(32)}${w(0)}`);
  });
});

describe("decodeAggregate3", () => {
  test("reads the node's answer", () => {
    expect(decodeAggregate3(NODE_RESULT, 2)).toEqual([false, false]);
  });

  test("a failed entry or a malformed return is no answer, never false or true", () => {
    const result = aggregateReturn([
      [true, `0x${w(1)}`],
      [false, "0x"],
      [true, `0x${w(0)}`],
      [true, "0x"],
      [true, `0x${w(2)}`],
      [true, `0x${w(1)}${w(1)}`],
    ]);
    expect(decodeAggregate3(result, 6)).toEqual([true, null, false, null, null, null]);
  });

  test("a different entry count throws", () => {
    expect(() => decodeAggregate3(NODE_RESULT, 3)).toThrow("aggregate3 returned 2 entries");
  });

  test("a truncated result throws", () => {
    expect(() => decodeAggregate3(NODE_RESULT.slice(0, 200), 2)).toThrow("ends at byte");
  });
});

const row = (id: string, transferable: boolean, cls: string | null = "First"): CheckedObjekt => ({
  id,
  class: cls,
  transferable,
});

describe("compareWithChain", () => {
  test("splits mismatches by direction and counts no answer as skipped", () => {
    const rows = [row("1", true), row("2", false), row("3", true), row("4", false)];
    const { mismatches, skipped } = compareWithChain(rows, [false, true, true, null]);
    expect(mismatches).toEqual([
      { ...row("1", true), chain: false, direction: "true-in-db" },
      { ...row("2", false), chain: true, direction: "false-in-db" },
    ]);
    expect(skipped).toEqual(["4"]);
  });

  test("a length mismatch throws", () => {
    expect(() => compareWithChain([row("1", true)], [])).toThrow();
  });
});

describe("addToTally", () => {
  test("counts checked rows and mismatches per class", () => {
    const rows = [row("1", true), row("2", true, "Welcome"), row("3", false, null)];
    const { mismatches } = compareWithChain(rows, [false, true, true]);
    const tally: Tally = new Map();
    addToTally(tally, rows, mismatches);
    addToTally(tally, [row("4", true)], []);
    expect(Object.fromEntries(tally)).toEqual({
      First: { checked: 2, "true-in-db": 1, "false-in-db": 0 },
      Welcome: { checked: 1, "true-in-db": 0, "false-in-db": 0 },
      "(no collection)": { checked: 1, "true-in-db": 0, "false-in-db": 1 },
    });
  });
});
