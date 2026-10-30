import { describe, expect, test } from "bun:test";

import { movingGeometry, stillGeometry } from "./banner";

describe("movingGeometry", () => {
  test("a wide source is cropped across its width, centred", () => {
    expect(movingGeometry({ width: 3000, height: 1000 })).toEqual({
      crop: { left: 300, top: 0, width: 2400, height: 1000 },
      output: { width: 1920, height: 800 },
    });
  });

  test("a tall source is cropped across its height, centred", () => {
    expect(movingGeometry({ width: 1080, height: 1920 })).toEqual({
      crop: { left: 0, top: 735, width: 1080, height: 450 },
      output: { width: 1080, height: 450 },
    });
  });

  test("1080p is capped at 1920 wide", () => {
    const { crop, output } = movingGeometry({ width: 1920, height: 1080 });
    expect(crop).toEqual({ left: 0, top: 140, width: 1920, height: 800 });
    expect(output).toEqual({ width: 1920, height: 800 });
  });

  test("a small source is never scaled up", () => {
    expect(movingGeometry({ width: 480, height: 270 }).output).toEqual({ width: 480, height: 200 });
  });

  test("output sides are even", () => {
    for (const source of [
      { width: 333, height: 777 },
      { width: 1001, height: 417 },
      { width: 7, height: 3 },
    ]) {
      const { output } = movingGeometry(source);
      expect(output.width % 2).toBe(0);
      expect(output.height % 2).toBe(0);
      expect(output.width).toBeLessThanOrEqual(Math.max(2, source.width));
    }
  });
});

describe("stillGeometry", () => {
  test("a large photo becomes 2400×1000 from its centre", () => {
    expect(stillGeometry({ width: 4000, height: 3000 })).toEqual({
      crop: { left: 0, top: 667, width: 4000, height: 1666 },
      output: { width: 2400, height: 1000 },
    });
  });

  test("a small image is cropped but never scaled up", () => {
    expect(stillGeometry({ width: 1200, height: 800 }).output).toEqual({
      width: 1200,
      height: 500,
    });
  });
});
