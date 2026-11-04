import { describe, expect, test } from "bun:test";

import { fromPartial } from "@total-typescript/shoehorn";

import type { PersonPostData, PostSideData } from "./post-types";
import { sharePreview } from "./share-preview";

const side = (role: PostSideData["role"], copyCount: number) =>
  fromPartial<PostSideData>({ role, list: { id: 1, slug: role }, items: [], copyCount });

const post = (tags: PersonPostData["tags"], sides: PostSideData[]) =>
  fromPartial<PersonPostData>({ id: 1, tags, sides });

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

  test("a post: its tags and its sides, with no image", () => {
    const wtt = post(["wtt"], [side("have", 4), side("want", 2)]);
    expect(sharePreview({ handle: "rin.trades", posts: [wtt] }, wtt)).toEqual({
      title: "rin.trades's WTT post",
      description: "Has 4 · Wants 2",
    });
  });

  test("several tags join with a slash", () => {
    const sale = post(["wts", "wtt"], [side("sale", 3), side("want", 1)]);
    expect(sharePreview({ handle: "mina", posts: [sale] }, sale).title).toBe("mina's WTT/WTS post");
  });
});
