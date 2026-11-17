import { describe, expect, test } from "bun:test";

import { expiryGroupKey } from "./cosmo-session";

describe("expiryGroupKey", () => {
  test("two expiries of one session give two keys", () => {
    expect(expiryGroupKey(7, "2027-01-01T00:00:00.000Z")).not.toBe(
      expiryGroupKey(7, "2027-06-30T00:00:00.000Z"),
    );
  });

  test("the same session and expiry give one key, whatever the text's precision", () => {
    expect(expiryGroupKey(7, "2027-01-01T00:00:00.000Z")).toBe(
      expiryGroupKey(7, "2027-01-01T00:00:00Z"),
    );
    expect(expiryGroupKey(7, "2027-01-01T00:00:00.000Z")).toBe("cosmo_session_expiry:7:1798761600");
  });

  test("another session has another key", () => {
    expect(expiryGroupKey(7, "2027-01-01T00:00:00.000Z")).not.toBe(
      expiryGroupKey(8, "2027-01-01T00:00:00.000Z"),
    );
  });
});
