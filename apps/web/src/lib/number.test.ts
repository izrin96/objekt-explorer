import { describe, expect, test } from "bun:test";

import { formatCount } from "./number";

describe("formatCount", () => {
  test("matches toLocaleString in each locale", () => {
    for (const locale of ["en", "ko", "ja"]) {
      for (const value of [0, 7, 1234, 1234567, 12.5]) {
        expect(formatCount(value, locale)).toBe(value.toLocaleString(locale));
      }
    }
  });
});
