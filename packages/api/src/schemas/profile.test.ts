import { describe, expect, test } from "bun:test";

import { BIO_MAX_LENGTH, makeEditProfileInputSchema, presignedPostInputSchema } from "./profile";

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

describe("edit profile input bio", () => {
  const schema = makeEditProfileInputSchema("https://cdn.example/profile-banner/");
  const base = {
    address: "0x1111111111111111111111111111111111111111",
    gridColumns: null,
  };

  test("a tab from before bios sends none, which keeps the stored bio", () => {
    const parsed = schema.parse({ ...base, bannerImgUrl: null, bannerImgType: null });
    expect(parsed.bio).toBeUndefined();
  });

  test("blank text and null clear the bio", () => {
    expect(schema.parse({ ...base, bio: "   " }).bio).toBeNull();
    expect(schema.parse({ ...base, bio: null }).bio).toBeNull();
  });

  test("the limit applies after normalising", () => {
    const full = "a".repeat(BIO_MAX_LENGTH);
    expect(schema.parse({ ...base, bio: `\n${full}  \n\n` }).bio).toBe(full);
    expect(schema.safeParse({ ...base, bio: `${full}a` }).success).toBe(false);
  });

  test("a huge body is refused", () => {
    expect(schema.safeParse({ ...base, bio: " ".repeat(BIO_MAX_LENGTH * 4 + 1) }).success).toBe(
      false,
    );
  });
});
