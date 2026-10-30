import { describe, expect, test } from "bun:test";

import { MAX_FILE_SIZE } from "@repo/api/constants";

import {
  backfillDecision,
  bannerKey,
  demuxerFor,
  displaySize,
  doneUrls,
  ffmpegArgs,
} from "./banner-backfill";

describe("backfillDecision", () => {
  test("types that misbehave are replaced even when larger", () => {
    for (const type of [
      "image/svg+xml",
      "image/bmp",
      "video/quicktime",
      "video/x-matroska",
      "video/ogg",
      "video/x-msvideo",
    ]) {
      expect(backfillDecision({ type, originalSize: 1000, newSize: 5000 })).toBe("replace");
    }
  });

  test("other types are replaced only when at least 10% smaller", () => {
    expect(backfillDecision({ type: "image/png", originalSize: 5000, newSize: 1000 })).toBe(
      "replace",
    );
    expect(backfillDecision({ type: "image/webp", originalSize: 1000, newSize: 900 })).toBe(
      "replace",
    );
    expect(backfillDecision({ type: "image/webp", originalSize: 1000, newSize: 950 })).toBe("keep");
    expect(backfillDecision({ type: "image/jpeg", originalSize: 1000, newSize: 1000 })).toBe(
      "keep",
    );
    expect(backfillDecision({ type: "video/mp4", originalSize: 1000, newSize: 2000 })).toBe("keep");
  });

  test("nothing over 10 MB is uploaded", () => {
    expect(
      backfillDecision({ type: "image/svg+xml", originalSize: 1, newSize: MAX_FILE_SIZE + 1 }),
    ).toBe("too-large");
  });
});

describe("displaySize", () => {
  test("a quarter turn swaps the sides", () => {
    expect(displaySize({ width: 1920, height: 1080, rotation: -90 })).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(displaySize({ width: 1920, height: 1080, rotation: 270 })).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  test("no rotation or a half turn keeps them", () => {
    expect(displaySize({ width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 });
    expect(displaySize({ width: 1920, height: 1080, rotation: 180 })).toEqual({
      width: 1920,
      height: 1080,
    });
  });
});

describe("ffmpegArgs", () => {
  test("crops the 2.4:1 centre, scales, drops audio and puts the index first", () => {
    const args = ffmpegArgs("in", "out.mp4", { width: 1080, height: 1920 }, "mov");
    expect(args.slice(args.indexOf("-f"), args.indexOf("-i") + 2)).toEqual([
      "-f",
      "mov",
      "-i",
      "in",
    ]);
    expect(args[args.indexOf("-vf") + 1]).toBe("crop=1080:450:0:735,scale=1080:450");
    expect(args).toContain("-an");
    expect(args[args.indexOf("-movflags") + 1]).toBe("+faststart");
    expect(args.at(-1)).toBe("out.mp4");
  });
});

describe("bannerKey", () => {
  test("matches getPresignedPost's format", () => {
    expect(bannerKey("0xABCdef", 1700000000000, "webp")).toBe(
      "profile-banner/0xabcdef-1700000000000.webp",
    );
  });
});

describe("demuxerFor", () => {
  test("names a demuxer for every moving type and none for others", () => {
    expect(demuxerFor("video/webm")).toBe("matroska");
    expect(demuxerFor("image/gif")).toBe("gif");
    expect(demuxerFor("application/x-mpegurl")).toBeNull();
  });
});

describe("doneUrls", () => {
  const old = "https://cdn/profile-banner/a-1.png";
  const fresh = "https://cdn/profile-banner/a-2.webp";

  test("a replaced banner's old and new URLs are both done", () => {
    const urls = doneUrls([
      { old, new: fresh, decision: "pending" },
      { old, new: fresh, decision: "replace" },
    ]);
    expect(urls.has(old)).toBe(true);
    expect(urls.has(fresh)).toBe(true);
  });

  test("a pending line alone leaves the old URL open and the new one closed", () => {
    const urls = doneUrls([{ old, new: fresh, decision: "pending" }]);
    expect(urls.has(old)).toBe(false);
    expect(urls.has(fresh)).toBe(true);
  });

  test("kept and orphaned banners are done", () => {
    const urls = doneUrls([
      { old, decision: "keep" },
      { old: "b", orphan: "c", decision: "orphan" },
    ]);
    expect([...urls].sort()).toEqual([old, "b", "c"].sort());
  });
});
