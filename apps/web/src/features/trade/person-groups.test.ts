import { describe, expect, test } from "bun:test";

import { groupByList } from "./person-groups";

const first = { id: 1 };
const second = { id: 2 };
const lists = [first, second];
const match = (slug: string, ...partnerListIds: number[]) => ({ slug, partnerListIds });

describe("groupByList", () => {
  test("one list", () => {
    expect(groupByList([match("x", 1), match("y", 1)], lists)).toEqual([
      { list: first, slugs: ["x", "y"] },
    ]);
  });

  test("two lists keep the order of lists, not of matches", () => {
    expect(groupByList([match("x", 2), match("y", 1)], lists)).toEqual([
      { list: first, slugs: ["y"] },
      { list: second, slugs: ["x"] },
    ]);
  });

  test("a match on two lists lands under the first", () => {
    expect(groupByList([match("x", 2, 1)], lists)).toEqual([{ list: first, slugs: ["x"] }]);
  });

  test("a match whose lists are all missing closes in an unlabelled group", () => {
    expect(groupByList([match("x", 1), match("y", 9)], lists)).toEqual([
      { list: first, slugs: ["x"] },
      { list: null, slugs: ["y"] },
    ]);
  });

  test("an empty direction has no groups", () => {
    expect(groupByList([], lists)).toEqual([]);
  });
});
