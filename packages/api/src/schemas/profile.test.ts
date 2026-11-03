import { describe, expect, test } from "bun:test";

import {
  BIO_MAX_LENGTH,
  makeEditProfileInputSchema,
  normalizeBio,
  presignedPostInputSchema,
} from "./profile";

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

describe("normalizeBio", () => {
  test("keeps line breaks and turns CRLF and CR into LF", () => {
    expect(normalizeBio("WTT Wonder\r\nDMs open\rafter 6pm")).toBe(
      "WTT Wonder\nDMs open\nafter 6pm",
    );
  });

  test("collapses a run of blank lines to one", () => {
    expect(normalizeBio("Hi\n\n\n\nWTT")).toBe("Hi\n\nWTT");
  });

  test("trims the text and each line's end", () => {
    expect(normalizeBio("  Hi   \n  WTT  \n")).toBe("Hi\n  WTT");
  });

  test("empty or blank text is no bio", () => {
    expect(normalizeBio("")).toBeNull();
    expect(normalizeBio(" \n\t \r\n ")).toBeNull();
  });

  test("drops control characters and bidi marks", () => {
    expect(normalizeBio("a\u0000b\u0007c\td")).toBe("abcd");
    expect(normalizeBio("x\u202Eevil\u202C\u2066y\u2069")).toBe("xevily");
  });

  test("a line of invisible fillers is blank", () => {
    expect(normalizeBio("\u200B")).toBeNull();
    expect(normalizeBio("\u3164 \u2800")).toBeNull();
    expect(normalizeBio("Hi\n\u200B\n\u200B\n\uFEFF\nWTT")).toBe("Hi\n\nWTT");
  });

  test("keeps ZWJ inside text, as emoji need it", () => {
    expect(normalizeBio("family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}")).toBe(
      "family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}",
    );
  });

  test("leaves markup and URLs as typed", () => {
    expect(normalizeBio("<b>hi</b> **bold** https://example.com")).toBe(
      "<b>hi</b> **bold** https://example.com",
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
    expect(schema.parse({ ...base, bio: `  ${full}  ` }).bio).toBe(full);
    expect(schema.safeParse({ ...base, bio: `${full}a` }).success).toBe(false);
  });

  test("a huge body is refused", () => {
    expect(schema.safeParse({ ...base, bio: " ".repeat(BIO_MAX_LENGTH * 4 + 1) }).success).toBe(
      false,
    );
  });
});
