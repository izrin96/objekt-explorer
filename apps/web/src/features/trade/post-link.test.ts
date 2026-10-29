import { describe, expect, test } from "bun:test";

import { postLinkSearch } from "./post-link";

describe("postLinkSearch", () => {
  test("narrows to the tag that matches the post's kind", () => {
    expect(postLinkSearch("u1", { kind: "sell", tags: ["wts"] })).toEqual({
      person: "u1",
      type: "wts",
    });
    expect(postLinkSearch("u1", { kind: "buy", tags: ["wtb"] }).type).toBe("wtb");
  });

  test("a sell post that also takes swaps links to Sell", () => {
    expect(postLinkSearch("u1", { kind: "sell", tags: ["wtt", "wts"] }).type).toBe("wts");
  });

  test("a swap post that also buys links to Swap", () => {
    expect(postLinkSearch("u1", { kind: "swap", tags: ["wtt", "wtb"] }).type).toBe("wtt");
  });

  test("leaves the type out when the post lacks its kind's tag", () => {
    expect(postLinkSearch("u1", { kind: "swap", tags: ["wtb"] })).toEqual({
      person: "u1",
      type: undefined,
    });
  });
});
