import { describe, expect, test } from "bun:test";

import { jsonEncoding, listCacheKey } from "./collection-list-cache-rules";

const key = (path: string, headers: Record<string, string> = {}) =>
  listCacheKey(new URL(path, "https://objekt.top"), new Headers(headers));

describe("listCacheKey", () => {
  test("keys the unfiltered list by its parsed shape", () => {
    expect(key("/api/v1/collections?originals=false&ids=false")).toBe("originals=false&ids=false");
    expect(key("/api/v1/collections?ids=false&originals=false")).toBe("originals=false&ids=false");
    expect(key("/api/v1/collections")).toBe("originals=true&ids=true");
  });

  test("gives every spelling of a value the same key", () => {
    const keys = ["false", "FALSE", "0", "no", "oFf", "n"].map((value) =>
      key(`/api/v1/collections?originals=false&ids=${value}`),
    );
    expect(new Set(keys)).toEqual(new Set(["originals=false&ids=false"]));
  });

  test("leaves filtered, refused and conditional requests to the handler", () => {
    expect(key("/api/v1/collections?artist=artms&originals=false")).toBeNull();
    expect(key("/api/v1/collections?at=2026-01-01T00:00:00.000Z")).toBeNull();
    expect(key("/api/v1/collections?ids=maybe")).toBeNull();
    expect(key("/api/v1/collections?ids=false&ids=true")).toBeNull();
    expect(
      key("/api/v1/collections?originals=false", {
        "if-modified-since": "Sun, 08 Nov 2026 11:12:59 GMT",
      }),
    ).toBeNull();
  });
});

describe("jsonEncoding", () => {
  test("prefers brotli, then gzip", () => {
    expect(jsonEncoding("gzip, deflate, br, zstd", true)).toBe("br");
    expect(jsonEncoding("gzip, deflate", true)).toBe("gzip");
    expect(jsonEncoding("identity", true)).toBe("identity");
    expect(jsonEncoding(null, true)).toBe("identity");
  });

  test("sends it as is when compression is off", () => {
    expect(jsonEncoding("br", false)).toBe("identity");
  });
});
