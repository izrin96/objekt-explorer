import { describe, expect, test } from "bun:test";

import { listModifiedMs, nextModifiedAt, uuidV7Ms } from "./collection-bump";

describe("nextModifiedAt", () => {
  const now = Date.parse("2026-11-04T10:00:00.500Z");

  test("with nothing stored, the list changed now", () => {
    expect(nextModifiedAt(now, null)).toBe(now);
  });

  test("a bump long after the last one is now", () => {
    expect(nextModifiedAt(now, "2026-11-04T09:00:00.000Z")).toBe(now);
  });

  test("a bump in the same second as the last one lands a second after it", () => {
    const previous = "2026-11-04T10:00:00.200Z";
    const next = nextModifiedAt(now, previous);
    expect(next).toBe(Date.parse(previous) + 1000);
    expect(Math.floor(next / 1000)).toBeGreaterThan(Math.floor(Date.parse(previous) / 1000));
  });

  test("a stored time ahead of the clock still moves forward", () => {
    expect(nextModifiedAt(now, "2026-11-04T10:00:05.000Z")).toBe(
      Date.parse("2026-11-04T10:00:06.000Z"),
    );
  });

  test("an unreadable stored value counts as nothing stored", () => {
    expect(nextModifiedAt(now, "not a date")).toBe(now);
  });
});

/** A UUIDv7 made at `ms`, its random bits zeroed. */
function v7At(ms: number) {
  const hex = ms.toString(16).padStart(12, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8)}-7000-8000-000000000000`;
}

const V4_ID = "9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b";

describe("uuidV7Ms", () => {
  const now = Date.parse("2026-11-13T10:00:00.000Z");

  test("reads the time a UUIDv7 was made", () => {
    const made = Date.parse("2026-11-04T10:00:00.500Z");
    expect(uuidV7Ms(v7At(made), now)).toBe(made);
  });

  test("a UUIDv4 carries no time", () => {
    expect(uuidV7Ms(V4_ID, now)).toBe(0);
  });

  test("a malformed id carries no time", () => {
    expect(uuidV7Ms("not-a-uuid", now)).toBe(0);
    expect(uuidV7Ms("", now)).toBe(0);
  });

  test("a time far past now is ignored, so it cannot pin the list in the future", () => {
    expect(uuidV7Ms("ffffffff-ffff-7fff-bfff-ffffffffffff", now)).toBe(0);
    expect(uuidV7Ms(v7At(now + 2 * 24 * 60 * 60 * 1000), now)).toBe(0);
  });

  test("a clock a little ahead still counts", () => {
    expect(uuidV7Ms(v7At(now + 60_000), now)).toBe(now + 60_000);
  });
});

describe("listModifiedMs", () => {
  const now = Date.parse("2026-11-13T10:00:00.000Z");
  const mint = "2026-11-13T09:50:00.000Z";
  const bump = "2026-11-13T09:55:00.000Z";
  const written = Date.parse("2026-11-13T09:58:00.250Z");

  test("a row written after a bump moves the list, though its mint is older than the bump", () => {
    expect(listModifiedMs(bump, { id: v7At(written), createdAt: mint }, now)).toBe(written);
  });

  test("a later bump wins", () => {
    const later = "2026-11-13T09:59:00.000Z";
    expect(listModifiedMs(later, { id: v7At(written), createdAt: mint }, now)).toBe(
      Date.parse(later),
    );
  });

  test("a row without a UUIDv7 falls back to its created_at", () => {
    expect(listModifiedMs(null, { id: V4_ID, createdAt: mint }, now)).toBe(Date.parse(mint));
  });

  test("reads the database's timestamp format", () => {
    expect(listModifiedMs(null, { id: "", createdAt: "2026-11-13 09:50:00.123+00" }, now)).toBe(
      Date.parse("2026-11-13T09:50:00.123Z"),
    );
  });

  test("an unreadable bump counts as none", () => {
    expect(listModifiedMs("not a date", { id: V4_ID, createdAt: mint }, now)).toBe(
      Date.parse(mint),
    );
  });

  test("with no rows, only the bump counts", () => {
    expect(listModifiedMs(bump, undefined, now)).toBe(Date.parse(bump));
  });

  test("with nothing at all, it is 0", () => {
    expect(listModifiedMs(null, undefined, now)).toBe(0);
  });
});
