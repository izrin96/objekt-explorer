import { describe, expect, test } from "bun:test";

import { decodeJwt, jwtVerify } from "jose";

import { signHs256 } from "./jwt";

const key = (secret: string) => new TextEncoder().encode(secret);

describe("signHs256", () => {
  test("signs a token only the shared secret verifies", async () => {
    const token = await signHs256(
      { sub: "u1", exp: Math.floor(Date.now() / 1000) + 60 },
      "secret-a",
    );
    expect(decodeJwt(token)).toMatchObject({ sub: "u1" });
    const { protectedHeader } = await jwtVerify(token, key("secret-a"), { algorithms: ["HS256"] });
    expect(protectedHeader.alg).toBe("HS256");
    const wrong = await jwtVerify(token, key("secret-b")).catch((error: unknown) => error);
    expect(wrong).toBeInstanceOf(Error);
  });
});
