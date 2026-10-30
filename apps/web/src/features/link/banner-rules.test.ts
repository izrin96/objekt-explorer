import { describe, expect, test } from "bun:test";

import { MAX_FILE_SIZE } from "@repo/api/constants";

import { bannerPlan, MAX_MOVING_PICK_SIZE, MAX_STILL_PICK_SIZE, uploadCheck } from "./banner-rules";

const MB = 1024 * 1024;
const file = (type: string, size: number) => ({ type, size });

describe("bannerPlan", () => {
  test("a still up to 25 MB is accepted", () => {
    expect(bannerPlan(file("image/png", 15 * MB))).toEqual({ kind: "still" });
    expect(bannerPlan(file("image/jpeg", MAX_STILL_PICK_SIZE))).toEqual({ kind: "still" });
  });

  test("a still over 25 MB is refused", () => {
    expect(bannerPlan(file("image/png", MAX_STILL_PICK_SIZE + 1))).toEqual({
      kind: "refuse",
      reason: "size",
      limit: MAX_STILL_PICK_SIZE,
    });
  });

  test("a GIF or video up to 100 MB is accepted", () => {
    expect(bannerPlan(file("image/gif", 60 * MB)).kind).toBe("moving");
    expect(bannerPlan(file("video/mp4", MAX_MOVING_PICK_SIZE)).kind).toBe("moving");
  });

  test("a GIF or video over 100 MB is refused", () => {
    expect(bannerPlan(file("video/quicktime", MAX_MOVING_PICK_SIZE + 1))).toEqual({
      kind: "refuse",
      reason: "size",
      limit: MAX_MOVING_PICK_SIZE,
    });
  });

  test("SVG, AVI and unknown types are refused", () => {
    for (const type of ["image/svg+xml", "video/x-msvideo", "application/pdf", ""]) {
      expect(bannerPlan(file(type, MB))).toEqual({ kind: "refuse", reason: "type" });
    }
  });

  test("only types that play as they are may upload unconverted", () => {
    for (const type of ["image/gif", "video/mp4", "video/x-m4v", "video/webm"]) {
      expect(bannerPlan(file(type, MB))).toEqual({ kind: "moving", rawFallback: true });
    }
    for (const type of ["video/quicktime", "video/x-matroska", "video/ogg"]) {
      expect(bannerPlan(file(type, MB))).toEqual({ kind: "moving", rawFallback: false });
    }
  });
});

describe("uploadCheck", () => {
  test("refuses over 10 MB", () => {
    expect(uploadCheck(file("video/mp4", MAX_FILE_SIZE))).toBe(true);
    expect(uploadCheck(file("video/mp4", MAX_FILE_SIZE + 1))).toBe(false);
  });
});
