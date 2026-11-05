import { describe, expect, test } from "bun:test";

import { reportInputSchema } from "../schemas/moderation";
import { flagsOf } from "../schemas/open-to";
import { type SnapshotList, postSnapshot } from "./report-post";

const base = {
  userId: "rin",
  linkedListId: null,
  takesSwaps: false,
  ...flagsOf("both"),
  description: null,
  discoverable: true,
  isProfileBind: true,
} satisfies Partial<SnapshotList>;

const doubles: SnapshotList = {
  ...base,
  id: 10,
  listType: "have",
  name: "doubles",
  slug: "dbl",
  linkedListId: 11,
  description: "  first line\n\n",
};
const wants: SnapshotList = {
  ...base,
  id: 11,
  listType: "want",
  name: "wants",
  slug: "wnt",
  linkedListId: 10,
  isProfileBind: false,
  ...flagsOf("swaps"),
};

describe("postSnapshot", () => {
  test("a WTT pair named by its want half resolves to the post, anchor first", () => {
    expect(postSnapshot([wants, doubles], 11)).toEqual({
      listId: 10,
      linkedListId: 11,
      lists: [
        { id: 10, type: "have", name: "doubles", slug: "dbl", description: "  first line" },
        { id: 11, type: "want", name: "wants", slug: "wnt", description: null },
      ],
      tags: ["wtt"],
      onTrade: true,
    });
  });

  test("a WTS sale list on its own", () => {
    const spares: SnapshotList = {
      ...base,
      id: 20,
      listType: "sale",
      name: "spares",
      slug: "spr",
      description: "DM me",
    };
    expect(postSnapshot([spares], 20)).toEqual({
      listId: 20,
      linkedListId: null,
      lists: [{ id: 20, type: "sale", name: "spares", slug: "spr", description: "DM me" }],
      tags: ["wts"],
      onTrade: true,
    });
  });

  test("a want-only post open to buying", () => {
    const buying: SnapshotList = {
      ...base,
      id: 30,
      listType: "want",
      name: "buying",
      slug: "buy",
      isProfileBind: false,
      ...flagsOf("buying"),
    };
    expect(postSnapshot([buying], 30)?.tags).toEqual(["wtb"]);
  });

  test("a post off Trade is kept and marked so", () => {
    const off = { ...doubles, discoverable: false };
    const offWants = { ...wants, discoverable: false };
    const snapshot = postSnapshot([off, offWants], 10);
    expect(snapshot?.onTrade).toBe(false);
    expect(snapshot?.listId).toBe(10);
  });

  test("a blank description becomes null", () => {
    const blank = { ...doubles, linkedListId: null, description: " \n\u200B\n " };
    expect(postSnapshot([blank], 10)?.lists[0]?.description).toBeNull();
  });

  test("a list that is not among the rows names no post", () => {
    expect(postSnapshot([doubles], 99)).toBeNull();
  });
});

describe("reportInputSchema", () => {
  test("an open tab's input, with no postListId, parses to the same data as before", () => {
    const old = { userId: "rin", reason: "scam", note: "paid first", tradeId: 4 };
    expect(reportInputSchema.parse(old)).toEqual({
      userId: "rin",
      reason: "scam",
      note: "paid first",
      tradeId: 4,
      share: true,
      alsoBlock: false,
    });
  });

  test("postListId is a positive integer", () => {
    expect(
      reportInputSchema.parse({ userId: "rin", reason: "spam", postListId: 7 }).postListId,
    ).toBe(7);
    expect(
      reportInputSchema.safeParse({ userId: "rin", reason: "spam", postListId: 0 }).success,
    ).toBe(false);
  });
});
