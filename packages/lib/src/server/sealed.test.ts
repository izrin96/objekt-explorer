import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { open, seal, sessionAad } from "./sealed";

const key = randomBytes(32).toString("base64");
const aad = sessionAad("user-1", "0xAbC0000000000000000000000000000000000001");

describe("sessionAad", () => {
  test("lowercases the address", () => {
    expect(sessionAad("user-1", "0xAbC")).toBe("cosmo_session:user-1:0xabc");
  });
});

describe("seal and open", () => {
  test("round trips", () => {
    expect(open(seal("cookie-value", key, aad), key, aad)).toBe("cookie-value");
  });

  test("has the v1.<iv>.<ct>.<tag> shape in base64url", () => {
    const [version, iv, ct, tag, ...rest] = seal("x", key, aad).split(".");
    expect(version).toBe("v1");
    expect(rest).toEqual([]);
    expect(Buffer.from(iv!, "base64url")).toHaveLength(12);
    expect(Buffer.from(tag!, "base64url")).toHaveLength(16);
    expect(ct).toMatch(/^[\w-]+$/);
  });

  test("two seals of one value differ", () => {
    expect(seal("same", key, aad)).not.toBe(seal("same", key, aad));
  });

  test("a wrong AAD fails", () => {
    const sealed = seal("v", key, aad);
    expect(() => open(sealed, key, sessionAad("user-1", "0xother"))).toThrow();
  });

  test("the same address under another user id fails", () => {
    const sealed = seal("v", key, sessionAad("user-1", "0xabc"));
    expect(() => open(sealed, key, sessionAad("user-2", "0xabc"))).toThrow();
  });

  test("the address case does not matter", () => {
    const sealed = seal("v", key, sessionAad("u", "0xABC"));
    expect(open(sealed, key, sessionAad("u", "0xabc"))).toBe("v");
  });

  test("a wrong key fails", () => {
    const sealed = seal("v", key, aad);
    expect(() => open(sealed, randomBytes(32).toString("base64"), aad)).toThrow();
  });

  test("a flipped tag byte fails", () => {
    const parts = seal("v", key, aad).split(".");
    const tag = Buffer.from(parts[3]!, "base64url");
    tag[0] = tag[0]! ^ 1;
    parts[3] = tag.toString("base64url");
    expect(() => open(parts.join("."), key, aad)).toThrow();
  });

  test("an unknown version prefix fails", () => {
    const sealed = seal("v", key, aad).replace(/^v1/, "v2");
    expect(() => open(sealed, key, aad)).toThrow();
  });

  test("malformed input fails", () => {
    expect(() => open("", key, aad)).toThrow();
    expect(() => open("v1.a.b", key, aad)).toThrow();
    expect(() => open("v1.a.b.c.d", key, aad)).toThrow();
  });

  test("a 16-byte key throws on seal and open", () => {
    const short = randomBytes(16).toString("base64");
    expect(() => seal("v", short, aad)).toThrow();
    expect(() => open(seal("v", key, aad), short, aad)).toThrow();
  });
});
