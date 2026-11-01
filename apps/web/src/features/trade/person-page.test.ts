import { describe, expect, test } from "bun:test";

import { slugTarget, withHandle } from "./person-page";
import type { PersonPostData, PostSideData } from "./post-types";

const side = (id: number, slug: string, role: PostSideData["role"]) =>
  ({ role, list: { id, slug }, items: [], copyCount: 0 }) as unknown as PostSideData;

/** a pair anchored on its have list, as the feed sends it */
const pair = (id: number, have: string, want: string) =>
  ({
    id,
    tags: ["wtt"],
    sides: [side(id, have, "have"), side(id + 1, want, "want")],
  }) as unknown as PersonPostData;

const wantOnly = (id: number, want: string) =>
  ({ id, tags: ["wtb"], sides: [side(id, want, "want")] }) as unknown as PersonPostData;

describe("withHandle", () => {
  test("swaps the handle and keeps the rest of the path and the search", () => {
    expect(withHandle("/trade/@Rin.Trades", "", "rin.trades")).toBe("/trade/@rin.trades");
    expect(withHandle("/trade/@rin.alt/spares", "", "rin.trades")).toBe(
      "/trade/@rin.trades/spares",
    );
    expect(withHandle("/trade/@rin.alt/offer", "?post=spares", "rin.trades")).toBe(
      "/trade/@rin.trades/offer?post=spares",
    );
  });

  test("stays a path on this site whatever the handle holds", () => {
    expect(withHandle("/trade/@x", "", "//evil.example")).toBe("/trade/@%2F%2Fevil.example");
  });
});

describe("slugTarget", () => {
  const posts = [pair(10, "spares", "hunt"), wantOnly(20, "wishlist")];

  test("the anchor's slug names its post", () => {
    expect(slugTarget(posts, "spares")).toEqual({ kind: "post", post: posts[0]! });
    expect(slugTarget(posts, "wishlist")).toEqual({ kind: "post", post: posts[1]! });
  });

  test("the want half of a pair leads to the anchor's slug", () => {
    expect(slugTarget(posts, "hunt")).toEqual({ kind: "anchor", slug: "spares" });
  });

  test("a slug no kept post holds is gone", () => {
    expect(slugTarget(posts, "taken-down")).toEqual({ kind: "gone" });
    expect(slugTarget([], "spares")).toEqual({ kind: "gone" });
  });
});
