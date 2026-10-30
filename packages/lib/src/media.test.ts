import { describe, expect, test } from "bun:test";

import { acceptedFileMimeTypes, mimeTypeFromKey } from "./media";

describe("acceptedFileMimeTypes", () => {
  test("SVG and AVI are no longer accepted", () => {
    expect(acceptedFileMimeTypes).not.toContain("image/svg+xml");
    expect(acceptedFileMimeTypes).not.toContain("video/x-msvideo");
  });
});

describe("mimeTypeFromKey", () => {
  test("banners stored as SVG or AVI keep their type", () => {
    expect(mimeTypeFromKey("profile-banner/x.svg")).toBe("image/svg+xml");
    expect(mimeTypeFromKey("profile-banner/x.avi")).toBe("video/x-msvideo");
  });

  test("accepted types round-trip through their extension", () => {
    expect(mimeTypeFromKey("profile-banner/x.webp")).toBe("image/webp");
    expect(mimeTypeFromKey("profile-banner/x.mp4")).toBe("video/mp4");
  });
});
