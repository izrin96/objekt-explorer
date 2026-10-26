import { describe, expect, test } from "bun:test";

import { heldByProfile } from "./held-by";

const MAIN = "0xdc2fe06ffa4aa0aaa94402502fd594e8bb92db09";
const ALT = "0xa3e673853647075ada40135f4272865b75f605a7";

describe("heldByProfile", () => {
  test("names the profile holding each objekt, by nickname", () => {
    const held = heldByProfile(
      new Map([
        ["1", MAIN],
        ["2", ALT.toUpperCase()],
      ]),
      [
        { address: MAIN, nickname: "izrin96" },
        { address: ALT, nickname: "izrin96_b" },
      ],
    );
    expect(held.get("1")).toEqual({ address: MAIN, name: "izrin96" });
    expect(held.get("2")).toEqual({ address: ALT, name: "izrin96_b" });
  });

  test("a profile with no nickname is named by its short address", () => {
    const held = heldByProfile(new Map([["1", ALT]]), [
      { address: MAIN, nickname: "izrin96" },
      { address: ALT, nickname: null },
    ]);
    expect(held.get("1")?.name).toBe("0xa3e6…05a7");
  });

  test("an objekt on none of the profiles is left out", () => {
    const held = heldByProfile(new Map([["1", "0xae1d4d847aba769b85c2e013ab78824ff4179c4a"]]), [
      { address: MAIN, nickname: "izrin96" },
      { address: ALT, nickname: "izrin96_b" },
    ]);
    expect(held.size).toBe(0);
  });

  test("one profile needs no split", () => {
    expect(heldByProfile(new Map([["1", MAIN]]), [{ address: MAIN, nickname: "a" }]).size).toBe(0);
  });
});
