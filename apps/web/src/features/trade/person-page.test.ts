import { describe, expect, test } from "bun:test";

import { offerHandleOf, slugTarget, withHandle } from "./person-page";
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
    expect(withHandle("/trade/@Rin.Trades", "rin.trades")).toBe("/trade/@rin.trades");
    expect(withHandle("/trade/@rin.alt/spares", "rin.trades")).toBe("/trade/@rin.trades/spares");
    expect(withHandle("/trade/@rin.alt/offer?post=spares", "rin.trades")).toBe(
      "/trade/@rin.trades/offer?post=spares",
    );
  });

  test("stays a path on this site whatever the handle holds", () => {
    expect(withHandle("/trade/@x", "//evil.example")).toBe("/trade/@%2F%2Fevil.example");
  });

  test("keeps an encoded slash, question mark or hash in the slug encoded", () => {
    expect(withHandle("/trade/@x/a%2Fb", "rin")).toBe("/trade/@rin/a%2Fb");
    expect(withHandle("/trade/@x/a%3Fto%3Dy", "rin")).toBe("/trade/@rin/a%3Fto%3Dy");
    expect(withHandle("/trade/@x/a%23b?post=1", "rin")).toBe("/trade/@rin/a%23b?post=1");
    expect(withHandle("/trade/@x/a%2F..%2F..%2Fmessages%2F5", "rin")).toBe(
      "/trade/@rin/a%2F..%2F..%2Fmessages%2F5",
    );
  });

  test("a handle in the old path that holds a question mark is swapped whole", () => {
    expect(withHandle("/trade/@a%3Fb/offer?x=1", "rin")).toBe("/trade/@rin/offer?x=1");
  });
});

describe("offerHandleOf", () => {
  test("Make offer goes by the profile's address, lower-cased, since a nickname can be shared", () => {
    expect(offerHandleOf({ handle: "rin", identity: { address: "0xAbC" } })).toBe("0xabc");
  });

  test("with no address, the canonical handle", () => {
    expect(offerHandleOf({ handle: "rin", identity: { address: null } })).toBe("rin");
  });

  test("no linked profile, no page and no Make offer", () => {
    expect(offerHandleOf({ handle: null, identity: { address: "0xabc" } })).toBeNull();
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
