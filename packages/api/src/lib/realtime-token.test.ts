import { describe, expect, test } from "bun:test";

import { CONNECTION_TOKEN_TTL_SECONDS, connectionClaims } from "./realtime-token";

describe("connectionClaims", () => {
  test("names the user and expires in ten minutes", () => {
    expect(connectionClaims("u1", 1_700_000_000_500)).toEqual({
      sub: "u1",
      iat: 1_700_000_000,
      exp: 1_700_000_000 + 600,
    });
    expect(CONNECTION_TOKEN_TTL_SECONDS).toBe(600);
  });
});
