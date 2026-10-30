import { describe, expect, test } from "bun:test";

import { presignedPostInputSchema } from "./profile";

const input = {
  address: "0x0000000000000000000000000000000000000001",
  fileName: "banner",
  fileSize: 1024,
};

describe("presignedPostInputSchema", () => {
  test("refuses SVG and AVI", () => {
    expect(
      presignedPostInputSchema.safeParse({ ...input, mimeType: "image/svg+xml" }).success,
    ).toBe(false);
    expect(
      presignedPostInputSchema.safeParse({ ...input, mimeType: "video/x-msvideo" }).success,
    ).toBe(false);
  });

  test("accepts WebP and MP4", () => {
    expect(presignedPostInputSchema.safeParse({ ...input, mimeType: "image/webp" }).success).toBe(
      true,
    );
    expect(presignedPostInputSchema.safeParse({ ...input, mimeType: "video/mp4" }).success).toBe(
      true,
    );
  });
});
