import { describe, expect, test } from "bun:test";

import type { PostKind } from "@repo/api/schemas/trade-post";

import { matchLines, previewTags, rowNote, unpairText } from "./post-kind-text";

// `m.*` returns a branded string, which `expect(...).toBe("...")` rejects.
const check = (actual: unknown) => expect(actual);

const NONE = { have: false, want: false, sale: false, alsoPay: false, alsoSwap: false };
const picks = (kind: PostKind, over: Partial<typeof NONE> = {}) => ({ kind, ...NONE, ...over });

const HAVE = "Matches people looking for what you offer.";
const WANT = "Matches people offering what you look for.";
const BOTH =
  "Matches people looking for what you offer, and people offering what you look for. When both ways match, they show under Can swap.";
const PAY = "Also shows under WTB, so sellers with what you look for find you.";
const SELL = "Matches WTB posts, and WTT posts that would also pay.";
const SELL_SWAP = "WTT posts looking for these match it too.";
const BUY = "Matches WTS posts with what you look for. No swaps.";
const PICK = "Pick at least one list.";

describe("matchLines", () => {
  test("swap with a have list only", () => {
    check(matchLines(picks("swap", { have: true }))).toEqual([HAVE]);
  });

  test("swap with a want list only", () => {
    check(matchLines(picks("swap", { want: true }))).toEqual([WANT]);
  });

  test("swap with both lists", () => {
    check(matchLines(picks("swap", { have: true, want: true }))).toEqual([BOTH]);
  });

  test("swap with neither list", () => {
    check(matchLines(picks("swap"))).toEqual([PICK]);
  });

  test("swap with also pay adds its line only once a want list is picked", () => {
    check(matchLines(picks("swap", { have: true, alsoPay: true }))).toEqual([HAVE]);
    check(matchLines(picks("swap", { want: true, alsoPay: true }))).toEqual([WANT, PAY]);
    check(matchLines(picks("swap", { have: true, want: true, alsoPay: true }))).toEqual([
      BOTH,
      PAY,
    ]);
    check(matchLines(picks("swap", { alsoPay: true }))).toEqual([PICK]);
  });

  test("sell without swaps", () => {
    check(matchLines(picks("sell", { sale: true }))).toEqual([SELL]);
  });

  test("sell with swaps", () => {
    check(matchLines(picks("sell", { sale: true, alsoSwap: true }))).toEqual([SELL, SELL_SWAP]);
  });

  test("sell with swaps keeps its swap line before a sale list is picked", () => {
    check(matchLines(picks("sell", { alsoSwap: true }))).toEqual([SELL, SELL_SWAP]);
  });

  test("sell with swaps, a want list and also pay", () => {
    check(
      matchLines(picks("sell", { sale: true, want: true, alsoSwap: true, alsoPay: true })),
    ).toEqual([SELL, SELL_SWAP, PAY]);
  });

  test("buy", () => {
    check(matchLines(picks("buy", { want: true }))).toEqual([BUY]);
    check(matchLines(picks("buy"))).toEqual([BUY]);
  });
});

describe("unpairText", () => {
  test("each kind words its own refusal", () => {
    check(unpairText("swap", "Rares")).toBe(
      "This list is paired with Rares. Posting it with another list unpairs them.",
    );
    check(unpairText("sell", "Rares")).toBe(
      "This list is paired with Rares for swaps. A Sell post without swaps doesn't keep the pair, so posting it unpairs them.",
    );
    check(unpairText("buy", "Rares")).toBe(
      "This list is paired with Rares for swaps. A Buy post doesn't swap, so posting it here unpairs them.",
    );
  });
});

describe("rowNote", () => {
  test("a list not bound to a profile", () => {
    check(rowNote({ reason: "needs_profile" }, null)).toBe(
      "Not bound to a Cosmo profile, so it can't go on Trade.",
    );
  });

  test("a list in a post names the post's kind", () => {
    const inPost = (kind: PostKind) => rowNote({ reason: "in_post", kind, slug: "a" }, null);
    check(inPost("swap")).toBe("In your Swap post");
    check(inPost("sell")).toBe("In your Sell post");
    check(inPost("buy")).toBe("In your Buy post");
  });

  test("a block wins over a partner", () => {
    check(rowNote({ reason: "needs_profile" }, "Rares")).toBe(
      "Not bound to a Cosmo profile, so it can't go on Trade.",
    );
  });

  test("a free list with a partner", () => {
    check(rowNote(null, "Rares")).toBe("Paired with Rares");
  });

  test("a free list with no partner has no note", () => {
    check(rowNote(null, null)).toBeNull();
  });
});

describe("previewTags", () => {
  test("falls back to the kind's own tag while nothing is picked", () => {
    check(previewTags(picks("swap"))).toEqual(["wtt"]);
    check(previewTags(picks("sell"))).toEqual(["wts"]);
    check(previewTags(picks("buy"))).toEqual(["wtb"]);
  });

  test("a Sell post with swaps and pay shows wts, wtt, wtb", () => {
    check(
      previewTags(picks("sell", { sale: true, want: true, alsoSwap: true, alsoPay: true })),
    ).toEqual(["wts", "wtt", "wtb"]);
  });

  test("a Sell post with swaps and no sale list falls back to wts", () => {
    check(previewTags(picks("sell", { alsoSwap: true }))).toEqual(["wts"]);
  });

  test("a Swap post with also pay adds wtb", () => {
    check(previewTags(picks("swap", { have: true, want: true, alsoPay: true }))).toEqual([
      "wtt",
      "wtb",
    ]);
  });
});
