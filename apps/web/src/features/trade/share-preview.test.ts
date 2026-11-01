import { describe, expect, test } from "bun:test";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import type { PersonPostData, PostSideData } from "./post-types";
import { sharePreview } from "./share-preview";

const side = (
  role: PostSideData["role"],
  copyCount: number,
  first?: string,
  ringedFirst?: string,
) =>
  ({
    role,
    list: { id: 1, slug: role },
    first,
    // the strip leads with what the viewer matched, which the preview must ignore
    items: ringedFirst ? [{ entryId: 1, slug: ringedFirst, qty: 1, ringed: true }] : [],
    copyCount,
  }) as unknown as PostSideData;

const post = (tags: PersonPostData["tags"], sides: PostSideData[]) =>
  ({ id: 1, tags, sides }) as unknown as PersonPostData;

const objekt = (slug: string) => ({ slug, thumbnailImage: `https://cdn.example/${slug}.png` });
const collections = {
  "seoyeon-204z": objekt("seoyeon-204z"),
  "jiwoo-101z": objekt("jiwoo-101z"),
} as unknown as Record<string, ValidObjekt>;

describe("sharePreview", () => {
  test("a person: their name, post count and tags in a fixed order", () => {
    const posts = [
      post(["wts"], [side("sale", 3)]),
      post(["wtt"], [side("have", 4)]),
      post(["wtt"], [side("have", 1)]),
      post(["wtt"], [side("have", 2)]),
    ];
    expect(sharePreview({ handle: "rin.trades", posts })).toEqual({
      title: "rin.trades on Trade",
      description: "4 posts · WTT, WTS",
    });
  });

  test("one post reads in the singular", () => {
    const posts = [post(["wtb"], [side("want", 2)])];
    expect(sharePreview({ handle: "rin.trades", posts }).description).toBe("1 post · WTB");
  });

  test("an address handle is shortened", () => {
    const handle = "0xabcdef0123456789abcdef0123456789abcdef01";
    expect(sharePreview({ handle, posts: [] }).title).toBe("0xabcd…ef01 on Trade");
  });

  test("a post: its tags, its sides, and the list's own first objekt as the image", () => {
    const wtt = post(
      ["wtt"],
      [side("have", 4, "seoyeon-204z", "jiwoo-101z"), side("want", 2, "jiwoo-101z")],
    );
    expect(sharePreview({ handle: "rin.trades", posts: [wtt] }, wtt, collections)).toEqual({
      title: "rin.trades's WTT post",
      description: "Has 4 · Wants 2",
      image: "https://cdn.example/seoyeon-204z.png",
    });
  });

  test("a post with nothing to offer has no image", () => {
    const wtb = post(["wtb"], [side("want", 2, "jiwoo-101z")]);
    const preview = sharePreview({ handle: "rin.trades", posts: [wtb] }, wtb, collections);
    expect(preview).toEqual({ title: "rin.trades's WTB post", description: "Wants 2" });
  });

  test("several tags join with a slash", () => {
    const sale = post(["wts", "wtt"], [side("sale", 3), side("want", 1)]);
    expect(sharePreview({ handle: "mina", posts: [sale] }, sale).title).toBe("mina's WTT/WTS post");
  });
});
