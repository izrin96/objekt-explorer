import { describe, expect, test } from "bun:test";

import { backImageOnly, imageSyncHash } from "./image-sync";

const front = "https://resources.cosmo.fans/images/collection-front-image/a.webp";
const back = "https://resources.cosmo.fans/images/collection-back-image/a.webp";
const processed = {
  frontImage: front,
  backImage: back,
  processedFrontImage: "https://cdn.example/front/a.webp",
  processedThumbnailImage: "https://cdn.example/thumbnail/a.webp",
  processedBackImage: null,
  imageSyncHash: imageSyncHash(front, ""),
};

describe("backImageOnly", () => {
  test("a back filled on a row processed with none fetches the back only", () => {
    expect(backImageOnly(processed)).toBe(true);
  });

  test("a changed front reprocesses everything", () => {
    expect(backImageOnly({ ...processed, imageSyncHash: imageSyncHash("other", "") })).toBe(false);
  });

  test("a replaced back reprocesses everything", () => {
    expect(
      backImageOnly({
        ...processed,
        processedBackImage: "https://cdn.example/back/a.webp",
        imageSyncHash: imageSyncHash(front, "old"),
      }),
    ).toBe(false);
  });

  test("a row never processed, or with no back, is not back-only", () => {
    expect(backImageOnly({ ...processed, processedFrontImage: null })).toBe(false);
    expect(backImageOnly({ ...processed, imageSyncHash: null })).toBe(false);
    expect(backImageOnly({ ...processed, backImage: "" })).toBe(false);
  });
});
