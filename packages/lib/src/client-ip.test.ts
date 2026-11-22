import { describe, expect, test } from "bun:test";

import { clientIp } from "./client-ip";

describe("clientIp", () => {
  test("prefers cf-connecting-ip over x-real-ip", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-real-ip": "172.70.1.1" });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  test("falls back to x-real-ip without Cloudflare", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  test("skips a blank header and trims", () => {
    const headers = new Headers({ "cf-connecting-ip": "  ", "x-real-ip": " 198.51.100.2 " });
    expect(clientIp(headers)).toBe("198.51.100.2");
  });

  test("ignores x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.9" }))).toBeUndefined();
  });
});
