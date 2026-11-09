import { describe, expect, test } from "bun:test";

import { activeNearOf, isTradeRole } from "./list-view-rules";

const near = {
  slugs: new Set(["a"]),
  listIdsOf: { a: [3, 4] },
  side: { verb: "sell" as const },
};
const list = { listType: "want", name: "Mine", user: { name: "Ann" }, profileAddress: null };

describe("isTradeRole", () => {
  test("have, want and sale only", () => {
    expect(["have", "want", "sale", "other"].map(isTradeRole)).toEqual([true, true, true, false]);
  });
});

describe("activeNearOf", () => {
  test("a near card gets the drawer's note", () => {
    expect(activeNearOf({ slug: "a" }, near, list)).toEqual({
      verb: "sell",
      role: "want",
      theirList: "Mine",
      myListIds: [3, 4],
      person: "Ann",
    });
  });

  test("not near, no card, no near section or a list without a trade role gives nothing", () => {
    expect(activeNearOf({ slug: "b" }, near, list)).toBeNull();
    expect(activeNearOf(null, near, list)).toBeNull();
    expect(activeNearOf({ slug: "a" }, null, list)).toBeNull();
    expect(activeNearOf({ slug: "a" }, near, { ...list, listType: "x" })).toBeNull();
  });

  test("a person without a name is the truncated address", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const note = activeNearOf({ slug: "a" }, near, {
      ...list,
      user: null,
      profileAddress: address,
    });
    expect(note?.person).toBeTruthy();
    expect(note?.person).not.toBe(address);
  });

  test("no name and no address leaves the person out", () => {
    expect(activeNearOf({ slug: "a" }, near, { ...list, user: null })?.person).toBeUndefined();
  });
});
