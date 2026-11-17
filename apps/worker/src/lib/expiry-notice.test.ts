import { describe, expect, test } from "bun:test";

import { expiryNotices } from "./expiry-notice";

const claimed = (id: number, userId: string, expiresAtMs: number) => ({ id, userId, expiresAtMs });

describe("expiryNotices", () => {
  test("one notice per claimed session, keyed by its id and expiry", () => {
    const { rows } = expiryNotices([
      claimed(1, "u1", Date.parse("2027-01-01T00:00:00.000Z")),
      claimed(2, "u1", Date.parse("2027-01-02T00:00:00.000Z")),
    ]);
    expect(rows).toEqual([
      {
        userId: "u1",
        type: "cosmo_session_expiry",
        payload: { expiresAt: "2027-01-01T00:00:00.000Z" },
        groupKey: "cosmo_session_expiry:1:1798761600",
      },
      {
        userId: "u1",
        type: "cosmo_session_expiry",
        payload: { expiresAt: "2027-01-02T00:00:00.000Z" },
        groupKey: "cosmo_session_expiry:2:1798848000",
      },
    ]);
  });

  test("the payload holds the expiry and nothing else", () => {
    const { rows } = expiryNotices([claimed(1, "u1", 0)]);
    expect(rows[0]?.payload).toStrictEqual({ expiresAt: "1970-01-01T00:00:00.000Z" });
  });

  test("a user with two sessions is told once, in order of first appearance", () => {
    const { userIds } = expiryNotices([
      claimed(1, "u2", 0),
      claimed(2, "u1", 0),
      claimed(3, "u2", 0),
    ]);
    expect(userIds).toEqual(["u2", "u1"]);
  });

  test("nothing claimed gives nothing", () => {
    expect(expiryNotices([])).toEqual({ rows: [], userIds: [] });
  });
});
