import { describe, expect, test } from "bun:test";

import { notificationSlugs, sameSlugs, shownSlugs, stackSlugs } from "./stack";

const loaded = (...slugs: string[]) => {
  const set = new Set(slugs);
  return (slug: string) => set.has(slug);
};

describe("stackSlugs", () => {
  test("keeps the order and stops at three", () => {
    expect(stackSlugs(["a", "b", "c", "d"], loaded("a", "b", "c", "d"))).toEqual(["a", "b", "c"]);
  });

  test("draws only collections that are loaded, so a gap does not leave a hole", () => {
    expect(stackSlugs(["a", "b", "c", "d"], loaded("b", "d"))).toEqual(["b", "d"]);
  });

  test("nothing loaded, or nothing named, is empty and falls back to the tile", () => {
    expect(stackSlugs(["a", "b"], loaded())).toEqual([]);
    expect(stackSlugs([], loaded("a"))).toEqual([]);
  });
});

describe("notificationSlugs", () => {
  test("an alert names its newest matches in order", () => {
    const latest = [{ collectionSlug: "a" }, { collectionSlug: "b" }];
    for (const type of ["want_match", "have_wanted"] as const) {
      expect(notificationSlugs({ type, payload: { latest } } as never)).toEqual(["a", "b"]);
    }
  });

  test("an offer or trade names its objekts, and none written before them", () => {
    for (const type of ["offer", "trade"] as const) {
      expect(notificationSlugs({ type, payload: { objekts: ["a", "b"] } } as never)).toEqual([
        "a",
        "b",
      ]);
      expect(notificationSlugs({ type, payload: {} } as never)).toEqual([]);
    }
  });

  test("a moderator notice names none", () => {
    expect(notificationSlugs({ type: "sanction", payload: {} } as never)).toEqual([]);
  });
});

describe("sameSlugs", () => {
  test("equal lists, and two missing ones, are the same", () => {
    expect(sameSlugs(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameSlugs(undefined, undefined)).toBe(true);
  });

  test("a missing list is the empty one", () => {
    expect(sameSlugs(undefined, [])).toBe(true);
    expect(sameSlugs([], undefined)).toBe(true);
    expect(sameSlugs(undefined, ["a"])).toBe(false);
  });

  test("a different length, or the same slugs in another order, is not the same", () => {
    expect(sameSlugs(["a"], ["a", "b"])).toBe(false);
    expect(sameSlugs(["a", "b"], ["b", "a"])).toBe(false);
  });
});

describe("shownSlugs", () => {
  const alert = {
    type: "want_match",
    payload: {
      latest: ["a", "b", "c", "d", "e"].map((collectionSlug) => ({ collectionSlug })),
    },
  } as never;

  test("drops slugs with no collection or no thumbnail, keeping the order", () => {
    const collections = {
      a: { thumbnailImage: "a.png" },
      b: { thumbnailImage: "" },
      d: { thumbnailImage: "d.png" },
    } as never;
    expect(shownSlugs(alert, collections)).toEqual(["a", "d"]);
  });

  test("stops at three, as stackSlugs does", () => {
    const collections = Object.fromEntries(
      ["a", "b", "c", "d", "e"].map((slug) => [slug, { thumbnailImage: `${slug}.png` }]),
    ) as never;
    expect(shownSlugs(alert, collections)).toEqual(["a", "b", "c"]);
  });

  test("a moderator notice shows none", () => {
    expect(shownSlugs({ type: "sanction", payload: {} } as never, {} as never)).toEqual([]);
  });
});
