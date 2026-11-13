import { describe, expect, test } from "bun:test";

import { anyCopyItem } from "./offer-any-item";
import type { ListEntryRef } from "./offer-rules";

const entry = (listSlug: string, objektId: string | null, hideSerial: boolean): ListEntryRef => ({
  listSlug,
  collectionSlug: "soomin-204z",
  objektId,
  hideSerial,
});
const shown = (
  id: string,
  over: Partial<Parameters<typeof anyCopyItem>[0]["shown"][number]> = {},
) => ({
  id,
  transferable: true,
  reserved: false,
  inScope: true,
  ...over,
});

describe("anyCopyItem", () => {
  test("a hidden-serial list only: every copy is hidden", () => {
    const item = anyCopyItem({
      entries: [entry("quiet", null, true)],
      spareIds: ["1", "2", "3"],
      shown: [],
      promised: 0,
    });
    expect(item).toEqual({ copies: 3, hidden: 3, listSlug: "quiet" });
  });

  test("entries naming copies on a list that shows serials still give an any item", () => {
    const item = anyCopyItem({
      entries: [entry("spares", "1", false), entry("spares", "2", false)],
      spareIds: ["1", "2"],
      shown: [shown("1"), shown("2")],
      promised: 0,
    });
    expect(item).toEqual({ copies: 2, hidden: 0, listSlug: "spares" });
  });

  test("mixed: the hidden list is the any item's list, not the shown one", () => {
    const item = anyCopyItem({
      entries: [
        entry("spares", "1", false),
        entry("spares", "2", false),
        entry("quiet", "3", true),
        entry("quiet", "4", true),
      ],
      spareIds: ["1", "2", "3", "4"],
      shown: [shown("1"), shown("2")],
      promised: 0,
    });
    expect(item).toEqual({ copies: 4, hidden: 2, listSlug: "quiet" });
  });

  test("a whole-collection entry on a list that shows serials is the any item's list", () => {
    const item = anyCopyItem({
      entries: [entry("spares", "1", false), entry("all", null, false)],
      spareIds: ["1", "2"],
      shown: [shown("1")],
      promised: 0,
    });
    expect(item?.listSlug).toBe("all");
  });

  test("a copy listed on two lists counts once", () => {
    const item = anyCopyItem({
      entries: [entry("a", "1", false), entry("b", "1", false)],
      spareIds: ["1", "1"],
      shown: [shown("1"), shown("1")],
      promised: 0,
    });
    expect(item).toEqual({ copies: 1, hidden: 0, listSlug: "a" });
  });

  test("a shown copy that is reserved or not transferable does not stand for a spare", () => {
    const item = anyCopyItem({
      entries: [entry("a", null, false)],
      spareIds: ["1", "2", "3"],
      shown: [shown("1"), shown("2", { reserved: true }), shown("3", { transferable: false })],
      promised: 0,
    });
    expect(item?.hidden).toBe(2);
  });

  test("hidden never goes below 0", () => {
    const item = anyCopyItem({
      entries: [entry("a", null, false)],
      spareIds: ["1", "2"],
      shown: [shown("1"), shown("2"), shown("3"), shown("4")],
      promised: 0,
    });
    expect(item?.hidden).toBe(0);
  });

  test("a kept counter copy on no list counts only when it is in scope", () => {
    const base = {
      entries: [entry("quiet", "1", true), entry("quiet", "2", true)],
      spareIds: ["1", "2"],
    };
    expect(anyCopyItem({ ...base, shown: [shown("9")], promised: 0 })?.hidden).toBe(1);
    expect(
      anyCopyItem({ ...base, shown: [shown("9", { inScope: false })], promised: 0 })?.hidden,
    ).toBe(2);
  });

  test("open any-copy legs subtract from copies, and none left means no item", () => {
    const base = { entries: [entry("a", null, true)], spareIds: ["1", "2", "3"], shown: [] };
    expect(anyCopyItem({ ...base, promised: 1 })).toEqual({ copies: 2, hidden: 2, listSlug: "a" });
    expect(anyCopyItem({ ...base, promised: 3 })).toBeNull();
  });
});
