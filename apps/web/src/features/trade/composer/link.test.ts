import { describe, expect, test } from "bun:test";

import type { PlanList } from "@repo/api/schemas/trade-post";

import { parseSearch, stringifySearch } from "@/features/filters/search-params";

import { NEW_POST, composerSearch, composerSearchSchema, resolveStart, returnPath } from "./link";

const list = (over: Partial<PlanList> & Pick<PlanList, "id" | "slug" | "listType">): PlanList => ({
  name: over.slug,
  linkedListId: null,
  discoverable: false,
  isProfileBind: true,
  matchSale: true,
  matchHave: true,
  takesSwaps: false,
  ...over,
});

/** a Sell post that takes swaps: binary-sale linked to binary-hunt, both on Trade */
const LISTS = [
  list({
    id: 1,
    slug: "binary-sale",
    listType: "sale",
    linkedListId: 2,
    discoverable: true,
    takesSwaps: true,
  }),
  list({
    id: 2,
    slug: "binary-hunt",
    listType: "want",
    linkedListId: 1,
    discoverable: true,
    isProfileBind: false,
  }),
  list({ id: 3, slug: "spares", listType: "have" }),
];

describe("composerSearch", () => {
  test("a new post links with no search", () => {
    expect(composerSearch(NEW_POST)).toEqual({});
  });

  test("an edit carries its picks, with replaces as edit, and round-trips", () => {
    const start = {
      kind: "sell" as const,
      have: null,
      want: "binary-hunt",
      sale: "binary-sale",
      alsoPay: true,
      alsoSwap: true,
      replaces: "binary-sale",
    };
    const search = composerSearch(start, "/list/binary-sale");
    expect(search).toEqual({
      kind: "sell",
      want: "binary-hunt",
      sale: "binary-sale",
      alsoPay: true,
      alsoSwap: true,
      edit: "binary-sale",
      from: "/list/binary-sale",
    });
    expect(resolveStart(composerSearchSchema.parse(search), LISTS)).toEqual(start);
  });

  test("its flags survive the URL, where the router hands them back as strings", () => {
    const start = {
      kind: "sell" as const,
      have: null,
      want: "binary-hunt",
      sale: "binary-sale",
      alsoPay: true,
      alsoSwap: true,
      replaces: "binary-sale",
    };
    const url = stringifySearch(composerSearch(start, "/list/binary-sale"));
    const parsed = composerSearchSchema.parse(parseSearch(url));
    expect(parsed.alsoPay).toBe(true);
    expect(parsed.alsoSwap).toBe(true);
    expect(resolveStart(parsed, LISTS)).toEqual(start);
  });

  test("an off-site from is left out", () => {
    expect(composerSearch(NEW_POST, "//evil.example")).toEqual({});
    expect(composerSearch(NEW_POST, "https://evil.example")).toEqual({});
  });
});

describe("composerSearchSchema", () => {
  test("a bad value falls back instead of failing the page", () => {
    const parsed = composerSearchSchema.parse({
      kind: "trade",
      have: "",
      alsoPay: 1,
      from: "/\\evil.example",
    });
    expect(parsed).toEqual({
      kind: undefined,
      have: undefined,
      want: undefined,
      sale: undefined,
      alsoPay: undefined,
      alsoSwap: undefined,
      edit: undefined,
      from: undefined,
    });
    expect(resolveStart(parsed, LISTS)).toEqual(NEW_POST);
  });

  test("a same-origin from is kept, with its search", () => {
    expect(composerSearchSchema.parse({ from: "/trade/for-you?match=mutual" }).from).toBe(
      "/trade/for-you?match=mutual",
    );
  });
});

describe("resolveStart", () => {
  test("drops a slug that isn't one of the viewer's lists of that side's type", () => {
    const start = resolveStart({ kind: "swap", have: "binary-hunt", want: "someone-elses" }, LISTS);
    expect(start).toEqual({ ...NEW_POST, kind: "swap" });
  });

  test("drops an edit that names none of the viewer's posts", () => {
    expect(resolveStart({ kind: "swap", have: "spares", edit: "spares" }, LISTS)).toEqual({
      ...NEW_POST,
      kind: "swap",
      have: "spares",
    });
  });

  test("an edit link without picks opens on the post as it stands", () => {
    expect(resolveStart({ edit: "binary-sale" }, LISTS)).toEqual({
      kind: "sell",
      have: null,
      want: "binary-hunt",
      sale: "binary-sale",
      alsoPay: true,
      alsoSwap: true,
      replaces: "binary-sale",
    });
  });
});

describe("returnPath", () => {
  test("Browse when from is missing or off-site", () => {
    expect(returnPath(undefined)).toBe("/trade");
    expect(returnPath("//evil.example")).toBe("/trade");
    expect(returnPath("javascript:alert(1)")).toBe("/trade");
    expect(returnPath("/\t/evil.example")).toBe("/trade");
  });

  test("from when it is a path", () => {
    expect(returnPath("/list/spares")).toBe("/list/spares");
  });
});
