import { describe, expect, test } from "bun:test";

import { isTimestamp, receivedAtCursorSchema, timestampCursorSchema } from "./cursor";

describe("isTimestamp", () => {
  test("accepts what the database writes and ISO 8601", () => {
    expect(isTimestamp("2026-10-17 00:00:00.123456+00")).toBe(true);
    expect(isTimestamp("2026-10-17 05:30:00+09:00")).toBe(true);
    expect(isTimestamp("2026-10-17T00:00:00.000Z")).toBe(true);
    expect(isTimestamp("0004-02-29 00:00:00+00")).toBe(true);
    expect(isTimestamp("0001-02-29 00:00:00+00")).toBe(false);
  });

  test("rejects what the timestamptz cast would throw on", () => {
    expect(isTimestamp("")).toBe(false);
    expect(isTimestamp("yesterday")).toBe(false);
    expect(isTimestamp("2026-02-30 00:00:00+00")).toBe(false);
    expect(isTimestamp("2026-13-01T00:00:00Z")).toBe(false);
    expect(isTimestamp("2026-10-17T24:00:00Z")).toBe(false);
    expect(isTimestamp("0000-10-17T00:00:00Z")).toBe(false);
    expect(isTimestamp("2026-10-17 00:00:00.1234567+00")).toBe(false);
  });
});

describe("cursor schemas", () => {
  test("accept the cursors the server sends", () => {
    const at = new Date("2026-10-17T00:00:00.123Z").toISOString();
    expect(
      timestampCursorSchema.safeParse({ timestamp: at, id: "0b5c9f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b" })
        .success,
    ).toBe(true);
    expect(receivedAtCursorSchema.safeParse({ receivedAt: at, id: "123456" }).success).toBe(true);
  });

  test("refuse what a cast would throw on", () => {
    const at = "2026-10-17T00:00:00.000Z";
    expect(
      timestampCursorSchema.safeParse({
        timestamp: "x",
        id: "0b5c9f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      }).success,
    ).toBe(false);
    expect(timestampCursorSchema.safeParse({ timestamp: at, id: "y" }).success).toBe(false);
    expect(receivedAtCursorSchema.safeParse({ receivedAt: "x", id: "1" }).success).toBe(false);
  });
});
