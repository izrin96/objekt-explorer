import { describe, expect, test } from "bun:test";

import { handleName, handleOwner, tradeHandle, tradePersonInputSchema } from "./trade-person";

const A = "0xAbCdEf0123456789abcdef0123456789ABCDEF01";
const B = "0x1111111111111111111111111111111111111111";

describe("tradeHandle", () => {
  test("the default profile's nickname, lower-cased", () => {
    expect(
      tradeHandle([
        { address: B, nickname: "rin.alt", isDefault: false },
        { address: A, nickname: "Rin.Trades", isDefault: true },
      ]),
    ).toBe("rin.trades");
  });

  test("no default, so the first linked profile", () => {
    expect(
      tradeHandle([
        { address: B, nickname: "First", isDefault: false },
        { address: A, nickname: "second", isDefault: false },
      ]),
    ).toBe("first");
  });

  test("no nickname, so the address", () => {
    expect(tradeHandle([{ address: A, nickname: null, isDefault: true }])).toBe(A.toLowerCase());
  });

  test("a nickname that is the address itself reads as none", () => {
    expect(tradeHandle([{ address: A, nickname: A, isDefault: true }])).toBe(A.toLowerCase());
  });

  test("no profile, so null", () => {
    expect(tradeHandle([])).toBeNull();
  });
});

describe("handleOwner", () => {
  test("the account whose own handle it is wins over an older row holding the nickname", () => {
    const oldHolder = {
      userId: "old",
      addresses: [
        { address: A, nickname: "rin", isDefault: false },
        { address: A, nickname: "rin.now", isDefault: true },
      ],
    };
    const owner = {
      userId: "owner",
      addresses: [{ address: B, nickname: "Rin", isDefault: true }],
    };
    expect(handleOwner("rin", [oldHolder, owner])).toBe("owner");
  });

  test("the input's letter case doesn't matter", () => {
    const owner = {
      userId: "owner",
      addresses: [{ address: B, nickname: "rin", isDefault: false }],
    };
    expect(
      handleOwner("RIN", [
        { userId: "other", addresses: [{ address: A, nickname: "x", isDefault: true }] },
        owner,
      ]),
    ).toBe("owner");
  });

  test("an address handle picks the account whose handle is that address", () => {
    const owner = { userId: "owner", addresses: [{ address: A, nickname: null, isDefault: true }] };
    expect(handleOwner(A, [owner])).toBe("owner");
  });

  test("no account's handle matches, so the first candidate", () => {
    expect(
      handleOwner("rin", [
        { userId: "first", addresses: [{ address: A, nickname: "a", isDefault: true }] },
        { userId: "second", addresses: [{ address: B, nickname: "b", isDefault: true }] },
      ]),
    ).toBe("first");
  });

  test("no candidates, so none", () => {
    expect(handleOwner("rin", [])).toBeUndefined();
  });
});

describe("handleName", () => {
  test("a nickname as it is, an address shortened", () => {
    expect(handleName("rin.trades")).toBe("rin.trades");
    expect(handleName(A.toLowerCase())).toBe("0xabcd…ef01");
  });
});

describe("tradePersonInputSchema", () => {
  test("takes a handle or a user id, not both or neither", () => {
    expect(tradePersonInputSchema.safeParse({ handle: "rin" }).success).toBe(true);
    expect(tradePersonInputSchema.safeParse({ userId: "u1" }).success).toBe(true);
    expect(tradePersonInputSchema.safeParse({ handle: "rin", userId: "u1" }).success).toBe(false);
    expect(tradePersonInputSchema.safeParse({}).success).toBe(false);
    expect(tradePersonInputSchema.safeParse({ handle: "x".repeat(65) }).success).toBe(false);
  });
});
