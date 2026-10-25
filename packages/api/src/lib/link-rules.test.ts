import { describe, expect, test } from "bun:test";

import { COOLDOWN_DAYS, linkRefusal, moveRefusal, unlinkRefusal } from "./link-rules";

const DAY = 24 * 60 * 60 * 1000;
const LEFT = new Date("2026-10-01T00:00:00Z");
const after = (ms: number) => new Date(LEFT.getTime() + ms);

describe("linkRefusal", () => {
  const leave = { userId: "a", at: LEFT };

  test("the account the address left relinks during the cooldown", () => {
    expect(
      linkRefusal({ callerId: "a", holders: [], lastLeave: leave, now: after(2 * DAY) }),
    ).toBeNull();
  });

  test("another account is refused until 7 days after the leave", () => {
    expect(
      linkRefusal({ callerId: "b", holders: [], lastLeave: leave, now: after(2 * DAY) }),
    ).toEqual({ reason: "cosmo_link_cooldown", retryAt: after(COOLDOWN_DAYS * DAY) });
  });

  test("refused just before 7 days, allowed at exactly 7 days", () => {
    const refused = linkRefusal({
      callerId: "b",
      holders: [],
      lastLeave: leave,
      now: after(COOLDOWN_DAYS * DAY - 1),
    });
    expect(refused?.reason).toBe("cosmo_link_cooldown");
    expect(
      linkRefusal({
        callerId: "b",
        holders: [],
        lastLeave: leave,
        now: after(COOLDOWN_DAYS * DAY),
      }),
    ).toBeNull();
  });

  test("a sanctioned previous holder refuses linking", () => {
    expect(
      linkRefusal({
        callerId: "b",
        holders: [{ userId: "a", sanctioned: true }],
        lastLeave: null,
        now: after(30 * DAY),
      }),
    ).toEqual({ reason: "cosmo_link_address_restricted" });
  });

  test("an expired or revoked sanction allows linking", () => {
    expect(
      linkRefusal({
        callerId: "b",
        holders: [{ userId: "a", sanctioned: false }],
        lastLeave: null,
        now: after(30 * DAY),
      }),
    ).toBeNull();
  });

  test("restricted wins over the cooldown", () => {
    expect(
      linkRefusal({
        callerId: "b",
        holders: [{ userId: "a", sanctioned: true }],
        lastLeave: leave,
        now: after(DAY),
      }),
    ).toEqual({ reason: "cosmo_link_address_restricted" });
  });

  test("no leave means no cooldown", () => {
    expect(linkRefusal({ callerId: "b", holders: [], lastLeave: null, now: LEFT })).toBeNull();
  });
});

describe("unlinkRefusal", () => {
  test("sanctioned is refused before in a trade", () => {
    expect(unlinkRefusal({ sanctioned: true, inOpenTrade: true })).toBe(
      "cosmo_link_unlink_sanctioned",
    );
    expect(unlinkRefusal({ sanctioned: false, inOpenTrade: true })).toBe(
      "cosmo_link_unlink_in_trade",
    );
    expect(unlinkRefusal({ sanctioned: false, inOpenTrade: false })).toBeNull();
  });
});

describe("moveRefusal", () => {
  const ok = {
    fromId: "a",
    toId: "b",
    holderNow: "a",
    sanctionedEither: false,
    inOpenTrade: false,
  };

  test("allows a clean move", () => {
    expect(moveRefusal(ok)).toBeNull();
  });

  test("refuses in order", () => {
    const all = { ...ok, toId: "a", holderNow: null, sanctionedEither: true, inOpenTrade: true };
    expect(moveRefusal(all)).toBe("same_account");
    expect(moveRefusal({ ...all, toId: "b" })).toBe("address_changed");
    expect(moveRefusal({ ...all, toId: "b", holderNow: "a" })).toBe("address_sanctioned");
    expect(moveRefusal({ ...all, toId: "b", holderNow: "a", sanctionedEither: false })).toBe(
      "address_in_trade",
    );
  });

  test("a staff unlink never gets same_account", () => {
    expect(moveRefusal({ ...ok, toId: undefined })).toBeNull();
    expect(moveRefusal({ ...ok, toId: undefined, holderNow: "x" })).toBe("address_changed");
  });
});
