import { describe, expect, test } from "bun:test";

import { identiconGrid } from "./identicon";

const A = "0x9ca6f3a1b2c4d5e6f708192a3b4c5d6e7f808b0d";
const B = "0x1357c9b8a7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2";

describe("identiconGrid", () => {
  test("one address always gives the same grid", () => {
    expect(identiconGrid(A)).toEqual(identiconGrid(A));
  });

  test("case does not matter", () => {
    expect(identiconGrid(A.toUpperCase().replace("0X", "0x"))).toEqual(identiconGrid(A));
  });

  test("two addresses give different grids", () => {
    expect(identiconGrid(A)).not.toEqual(identiconGrid(B));
  });

  test("every grid is 5x5 and mirrored", () => {
    for (const address of [A, B, "0x" + "f".repeat(40), "0x" + "0".repeat(40), ""]) {
      const grid = identiconGrid(address);
      expect(grid).toHaveLength(5);
      for (const row of grid) {
        expect(row).toHaveLength(5);
        expect(row).toEqual([...row].reverse());
      }
    }
  });
});
