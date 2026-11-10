import { describe, expect, test } from "bun:test";

import { fromPartial } from "@total-typescript/shoehorn";

import { toPlanList } from "./plan-list";

describe("toPlanList", () => {
  test("carries a full list over", () => {
    const list = fromPartial<Parameters<typeof toPlanList>[0]>({
      id: 1,
      slug: "have",
      name: "Have",
      listType: "have",
      linkedList: { id: 2 },
      discoverable: true,
      isProfileBind: true,
      matchSale: false,
      matchHave: false,
      takesSwaps: true,
    });
    expect(toPlanList(list)).toEqual({
      id: 1,
      slug: "have",
      name: "Have",
      listType: "have",
      linkedListId: 2,
      discoverable: true,
      isProfileBind: true,
      matchSale: false,
      matchHave: false,
      takesSwaps: true,
    });
  });

  test("a want list from before Open to is open to both and takes no swaps", () => {
    const list = fromPartial<Parameters<typeof toPlanList>[0]>({
      id: 1,
      slug: "want",
      name: "Want",
      listType: "want",
      linkedList: null,
      isProfileBind: false,
    });
    expect(toPlanList(list)).toMatchObject({
      linkedListId: null,
      discoverable: false,
      matchSale: true,
      matchHave: true,
      takesSwaps: false,
    });
  });
});
