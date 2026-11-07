import { describe, expect, test } from "bun:test";

import { deltaE2000, parseLab } from "./color-distance";

const delta = (a: string, b: string) => deltaE2000(parseLab(a)!, parseLab(b)!);

describe("parseLab", () => {
  test("reads hex in its three lengths, ignoring alpha and surrounding spaces", () => {
    expect(parseLab("#fff")).toEqual(parseLab("#ffffff"));
    expect(parseLab("#ffffff80")).toEqual(parseLab("#ffffff"));
    expect(parseLab(" #345570")).toEqual(parseLab("#345570"));
  });

  test("reads rgb() and rgba() as the hex of the same channels", () => {
    expect(parseLab("rgb(247, 247, 247)")).toEqual(parseLab("#f7f7f7"));
    expect(parseLab("rgba(126, 0, 255, 0.5)")).toEqual(parseLab("#7e00ff"));
  });

  test("white is L 100, black L 0", () => {
    expect(parseLab("#ffffff")![0]).toBeCloseTo(100, 3);
    expect(parseLab("#000000")![0]).toBeCloseTo(0, 3);
  });

  test("gives null for anything else", () => {
    for (const text of ["", "red", "#12", "#12345", "rgb(300, 0, 0)", "hsl(0, 0%, 0%)"]) {
      expect(parseLab(text)).toBeNull();
    }
  });
});

describe("deltaE2000", () => {
  // what chroma-js 3.2's deltaE gave for these pairs, which the colour filter used before
  test.each([
    ["#ff0000", "#00ff00", 86.6083],
    ["#345570", "#3a5a78", 2.2355],
    ["#e1ba58", "#d71518", 45.0084],
    ["#f7f7f7", "#ffffff", 1.6035],
    ["#7e00ff", "#75fb4c", 75.1729],
    ["#000000", "#808080", 39.9345],
  ])("%s to %s is %d, as chroma-js had it", (a, b, expected) => {
    expect(delta(a, b)).toBeCloseTo(expected, 3);
  });

  test("is zero for one colour and the same either way round", () => {
    expect(delta("#345570", "#345570")).toBe(0);
    expect(delta("#e1ba58", "#345570")).toBeCloseTo(delta("#345570", "#e1ba58"), 10);
  });

  test("stays within 0 to 100", () => {
    expect(delta("#000000", "#ffffff")).toBe(100);
  });
});
