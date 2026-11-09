import { describe, expect, test } from "bun:test";

import { tradePostLink } from "./list-link";

const ADDRESS = "0xAbC0000000000000000000000000000000000001";

describe("tradePostLink", () => {
  test("a bound list opens its own post page under its profile", () => {
    expect(tradePostLink({ slug: "spares", profileAddress: ADDRESS, linkedList: null })).toEqual({
      to: "/trade/@{$handle}/$slug",
      params: { handle: ADDRESS.toLowerCase(), slug: "spares" },
    });
  });

  test("a want list goes through its linked list's profile, at its own slug", () => {
    expect(
      tradePostLink({
        slug: "binary-hunt",
        profileAddress: null,
        linkedList: { profileAddress: ADDRESS },
      }),
    ).toEqual({
      to: "/trade/@{$handle}/$slug",
      params: { handle: ADDRESS.toLowerCase(), slug: "binary-hunt" },
    });
  });

  test("an unbound want list goes through its owner's Trade handle", () => {
    expect(
      tradePostLink({ slug: "wants", profileAddress: null, linkedList: null, tradeHandle: "rin" }),
    ).toEqual({
      to: "/trade/@{$handle}/$slug",
      params: { handle: "rin", slug: "wants" },
    });
  });

  test("a want list with no profile, linked list or handle has no post page", () => {
    expect(tradePostLink({ slug: "wants", profileAddress: null, linkedList: null })).toBeNull();
    expect(
      tradePostLink({ slug: "wants", profileAddress: null, linkedList: { profileAddress: null } }),
    ).toBeNull();
  });

  test("the address is lower-cased", () => {
    const link = tradePostLink({ slug: "spares", profileAddress: ADDRESS, linkedList: null });
    expect(link?.params.handle).toBe(ADDRESS.toLowerCase());
  });
});
