import { afterEach, describe, expect, test } from "bun:test";

import { getLocale, overwriteGetLocale } from "@/paraglide/runtime";

import { formatCount } from "./number";

const appLocale = getLocale;

describe("formatCount", () => {
  afterEach(() => overwriteGetLocale(appLocale));

  test("matches toLocaleString in each locale", () => {
    for (const locale of ["en", "ko", "ja"]) {
      for (const value of [0, 7, 1234, 1234567, 12.5]) {
        expect(formatCount(value, locale)).toBe(value.toLocaleString(locale));
      }
    }
  });

  test("with no locale given, reads the app's", () => {
    overwriteGetLocale(() => "de" as ReturnType<typeof getLocale>);
    expect(formatCount(1234567.5)).toBe("1.234.567,5");
  });
});
