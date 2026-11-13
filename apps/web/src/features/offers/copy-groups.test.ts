import { describe, expect, test } from "bun:test";

import { type CandidateItem, OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";

import {
  anyControlOf,
  anyElsewhere,
  applyGroup,
  canSelectAll,
  clearGroup,
  confirmOf,
  dialogFooter,
  dialogRoom,
  draftOf,
  groupItems,
  rowOf,
  rowsNameLists,
  selectAll,
  tileOf,
  toggleAny,
  toggleCopy,
} from "./copy-groups";
import { type OfferPick, anyKey, toPick } from "./pick";

function copy(slug: string, serial: number, over: Partial<CandidateItem> = {}): CandidateItem {
  return {
    collectionSlug: slug,
    objektId: `${slug}-${serial}`,
    serial,
    serialEstimated: false,
    transferable: true,
    reserved: false,
    inOpenOffer: [],
    listSlug: "doubles",
    copies: null,
    bySerial: false,
    ...over,
  };
}

function anyOf(slug: string, copies: number, over: Partial<CandidateItem> = {}): CandidateItem {
  return {
    ...copy(slug, 0, { objektId: null, serial: null, copies }),
    ...over,
  };
}

const picks = (...items: CandidateItem[]) =>
  new Map<string, OfferPick>(items.map((item) => [toPick(item).key, toPick(item)]));
const withCount = (item: CandidateItem, count: number) =>
  new Map([[toPick(item).key, { ...toPick(item), count }]]);
const none = new Map<string, OfferPick>();
const groupOf = (...items: CandidateItem[]) => groupItems(items)[0]!;
const lines = (group: ReturnType<typeof groupOf>, selection = none, room = 50) =>
  tileOf(group, selection, room).lines;

describe("groupItems", () => {
  test("groups in first-seen order, shown copies ascending, the any item apart", () => {
    const groups = groupItems([
      copy("b", 9),
      copy("a", 7),
      anyOf("b", 2, { hidden: 2 }),
      copy("b", 3),
      copy("a", 2),
    ]);
    expect(groups.map((g) => g.slug)).toEqual(["b", "a"]);
    expect(groups[0]!.shown.map((i) => i.serial)).toEqual([3, 9]);
    expect(groups[0]!.any?.objektId).toBeNull();
    expect(groups[1]!.any).toBeNull();
    expect(groups[1]!.shown.map((i) => i.serial)).toEqual([2, 7]);
  });

  test("lists come in the order they appear, once each", () => {
    const group = groupOf(
      copy("a", 1, { listSlug: "spares" }),
      copy("a", 2, { listSlug: "doubles" }),
      copy("a", 3, { listSlug: "spares" }),
      copy("a", 4, { listSlug: null }),
    );
    expect(group.lists).toEqual(["spares", "doubles"]);
  });

  test("the ratio is shared only when every item carries the same one", () => {
    expect(groupOf(copy("a", 1, { ratio: 2 }), copy("a", 2, { ratio: 2 })).ratio).toBe(2);
    expect(groupOf(copy("a", 1, { ratio: 2 }), copy("a", 2, { ratio: 3 })).ratio).toBeNull();
    expect(groupOf(copy("a", 1, { ratio: 2 }), copy("a", 2)).ratio).toBeNull();
    expect(groupOf(copy("a", 1, { ratio: 4 })).ratio).toBe(4);
    expect(groupOf(copy("a", 1)).ratio).toBeNull();
  });
});

describe("tileOf: section 3 states", () => {
  test("hidden group: a count tile reading Any serial and what is available", () => {
    const group = groupOf(anyOf("105z", 3, { hidden: 3 }));
    expect(tileOf(group, none, 50)).toEqual({
      kind: "count",
      lines: [{ kind: "anyAvailable", count: 3 }],
      mark: null,
      disabled: false,
      ratio: null,
    });
    const held = tileOf(group, withCount(group.any!, 2), 50);
    expect(held.mark).toBe("check");
    expect(held.lines).toEqual([{ kind: "anyAvailable", count: 3 }]);
  });

  test("hidden, single copy", () => {
    const group = groupOf(anyOf("209z", 1, { hidden: 1 }));
    expect(lines(group)).toEqual([{ kind: "anyAvailable", count: 1 }]);
  });

  test("shown group, several copies: opens the dialog", () => {
    const group = groupOf(...[8, 73, 140].map((n) => copy("101z", n)));
    const tile = tileOf(group, none, 50);
    expect(tile.kind).toBe("dialog");
    expect(tile.lines).toEqual([{ kind: "choose", count: 3 }]);
    expect(tile.mark).toBeNull();
  });

  test("a single shown copy toggles at once and shows its serial", () => {
    const only = copy("301z", 1203);
    const tile = tileOf(groupOf(only), none, 50);
    expect(tile).toEqual({
      kind: "toggle",
      lines: [{ kind: "serial", item: only }],
      mark: null,
      disabled: false,
      ratio: null,
    });
    expect(tileOf(groupOf(only), picks(only), 50).mark).toBe("check");
  });

  test("partly picked reads picked of count, marked with the number", () => {
    const items = [537, 904, 1, 2, 3].map((n) => copy("304z", n));
    const tile = tileOf(groupOf(...items), picks(items[0]!, items[1]!), 50);
    expect(tile.lines).toEqual([{ kind: "picked", picked: 2, count: 5 }]);
    expect(tile.mark).toBe(2);
  });

  test("fully picked reads all and marks the number", () => {
    const items = [221, 640, 1002].map((n) => copy("207z", n));
    const tile = tileOf(groupOf(...items), picks(...items), 50);
    expect(tile.lines).toEqual([{ kind: "all", count: 3 }]);
    expect(tile.mark).toBe(3);
  });

  test("some copies unavailable: counts the available and says how many can't be offered", () => {
    const items = [
      copy("310z", 44),
      copy("310z", 318, { transferable: false }),
      copy("310z", 702, { reserved: true }),
      copy("310z", 955),
      copy("310z", 1460),
    ];
    const group = groupOf(...items);
    expect(lines(group)).toEqual([
      { kind: "choose", count: 3 },
      { kind: "cantOffer", count: 2 },
    ]);
    expect(lines(group, picks(items[0]!))).toEqual([
      { kind: "picked", picked: 1, count: 3 },
      { kind: "cantOffer", count: 2 },
    ]);
  });

  test("every copy unavailable, single: disabled, with the copy's own flag to show", () => {
    const tile = tileOf(groupOf(copy("203z", 77, { reserved: true })), none, 50);
    expect(tile.kind).toBe("toggle");
    expect(tile.disabled).toBe(true);
  });

  test("every copy unavailable, several: None available, and the dialog still opens", () => {
    const group = groupOf(copy("a", 1, { transferable: false }), copy("a", 2, { reserved: true }));
    const tile = tileOf(group, none, 50);
    expect(tile.kind).toBe("dialog");
    expect(tile.disabled).toBe(false);
    expect(tile.lines).toEqual([{ kind: "none" }, { kind: "cantOffer", count: 2 }]);
  });

  test("estimated serials change nothing about the lines", () => {
    const group = groupOf(
      ...[12, 57, 88, 140].map((n) => copy("402z", n, { serialEstimated: true })),
    );
    expect(lines(group)).toEqual([{ kind: "choose", count: 4 }]);
  });

  test("a copy in another open offer is no flag on the tile and stays pickable", () => {
    const items = [copy("101z", 588, { inOpenOffer: [874] }), copy("101z", 9)];
    const tile = tileOf(groupOf(...items), none, 50);
    expect(tile.lines).toEqual([{ kind: "choose", count: 2 }]);
    const single = tileOf(groupOf(copy("x", 5, { inOpenOffer: [12] })), none, 50);
    expect(single.disabled).toBe(false);
  });

  test("mixed: one shown copy and hidden copies open the dialog, Q2 not applying", () => {
    const group = groupOf(copy("204z", 615), anyOf("204z", 2, { hidden: 2 }));
    expect(tileOf(group, none, 50)).toEqual({
      kind: "dialog",
      lines: [
        { kind: "choose", count: 1 },
        { kind: "more", count: 2 },
      ],
      mark: null,
      disabled: false,
      ratio: null,
    });
  });

  test("mixed: both serials and one any copy read 2 of 4 picked", () => {
    const group = groupOf(
      copy("204z", 615, { listSlug: "spares" }),
      copy("204z", 1077, { listSlug: "spares" }),
      anyOf("204z", 4, { hidden: 2, listSlug: "quiet haves" }),
    );
    const selection = new Map([...picks(group.shown[0]!), ...withCount(group.any!, 1)]);
    const tile = tileOf(group, selection, 50);
    expect(tile.lines).toEqual([
      { kind: "picked", picked: 2, count: 4 },
      { kind: "more", count: 2 },
    ]);
    expect(tile.mark).toBe(2);
  });

  test("ratio: the group's shared ratio is on the group", () => {
    const group = groupOf(...[1, 2, 3].map((n) => copy("312z", n, { ratio: 2 })));
    expect(group.ratio).toBe(2);
    expect(tileOf(group, none, 50).kind).toBe("dialog");
  });

  test("a held any count above one in a shown-only group opens the dialog", () => {
    const group = groupOf(copy("a", 1), anyOf("a", 3, { hidden: 0, bySerial: true }));
    expect(tileOf(group, withCount(group.any!, 3), 50).kind).toBe("dialog");
  });
});

describe("tileOf: a full side", () => {
  const items = [537, 904, 1].map((n) => copy("304z", n));
  const group = groupOf(...items);

  test("a tile with no picks does nothing", () => {
    expect(tileOf(group, none, 0).disabled).toBe(true);
    expect(tileOf(groupOf(copy("a", 1)), none, 0).disabled).toBe(true);
    expect(tileOf(groupOf(anyOf("a", 2, { hidden: 2 })), none, 0).disabled).toBe(true);
  });

  test("a tile with picks still opens", () => {
    expect(tileOf(group, picks(items[0]!), 0).disabled).toBe(false);
    const hidden = groupOf(anyOf("a", 2, { hidden: 2 }));
    expect(tileOf(hidden, withCount(hidden.any!, 1), 0).disabled).toBe(false);
  });
});

describe("anyControlOf: section 4.1 table", () => {
  test("hidden copies beside shown ones: a count whose top ignores the serials checked", () => {
    const group = groupOf(copy("204z", 615), copy("204z", 1077), anyOf("204z", 4, { hidden: 2 }));
    expect(anyControlOf(group, picks(...group.shown), 50, none)).toEqual({
      kind: "count",
      value: 0,
      top: 2,
      available: 2,
    });
  });

  test("shown only, two or more available: a checkbox worth one", () => {
    const group = groupOf(...[1, 2, 3].map((n) => copy("a", n)), anyOf("a", 3, { hidden: 0 }));
    expect(anyControlOf(group, none, 50, none)).toEqual({
      kind: "checkbox",
      checked: false,
      disabled: false,
    });
    expect(anyControlOf(group, withCount(group.any!, 1), 50, none)).toEqual({
      kind: "checkbox",
      checked: true,
      disabled: false,
    });
  });

  test("shown only, every serial picked: the checkbox is disabled", () => {
    const group = groupOf(...[1, 2, 3].map((n) => copy("a", n)), anyOf("a", 3, { hidden: 0 }));
    expect(anyControlOf(group, picks(...group.shown), 50, none)).toEqual({
      kind: "checkbox",
      checked: false,
      disabled: true,
    });
  });

  test("shown only, one available copy: none", () => {
    const group = groupOf(
      copy("a", 221),
      copy("a", 640, { reserved: true }),
      anyOf("a", 1, { hidden: 0 }),
    );
    expect(anyControlOf(group, none, 50, none)).toEqual({ kind: "none" });
  });

  test("a single shown copy: none", () => {
    const group = groupOf(copy("a", 537), anyOf("a", 1, { hidden: 0 }));
    expect(anyControlOf(group, none, 50, none)).toEqual({ kind: "none" });
  });

  test("no any item, as on You give and a collection: none", () => {
    expect(anyControlOf(groupOf(copy("a", 1), copy("a", 2)), none, 50, none)).toEqual({
      kind: "none",
    });
  });

  test("a count held above one with nothing hidden: a count that can only come down", () => {
    const group = groupOf(
      ...[1, 2, 3].map((n) => copy("a", n)),
      anyOf("a", 3, { bySerial: true, hidden: 0 }),
    );
    expect(anyControlOf(group, withCount(group.any!, 3), 50, none)).toEqual({
      kind: "count",
      value: 3,
      top: 3,
      available: 3,
    });
  });
});

describe("rowOf, toggleCopy and settle", () => {
  const group = groupOf(...[1, 2, 3].map((n) => copy("a", n)), anyOf("a", 3, { hidden: 0 }));

  test("an unavailable row is disabled, an unchecked one too at the room", () => {
    const [one, two] = group.shown;
    expect(rowOf(one!, none, 50)).toEqual({ checked: false, disabled: false });
    expect(rowOf(copy("a", 9, { transferable: false }), none, 50).disabled).toBe(true);
    expect(rowOf(two!, picks(one!), 1).disabled).toBe(true);
    expect(rowOf(one!, picks(one!), 1)).toEqual({ checked: true, disabled: false });
  });

  test("checking the last serial unchecks Any serial", () => {
    const [one, two, three] = group.shown;
    const draft = new Map([...picks(one!, two!), ...withCount(group.any!, 1)]);
    const next = toggleCopy(group, draft, three!);
    expect(next.has(anyKey("a"))).toBe(false);
    expect(next.size).toBe(3);
  });

  test("unchecking a row that was checked leaves the rest", () => {
    const [one, two] = group.shown;
    expect([...toggleCopy(group, picks(one!, two!), one!).keys()]).toEqual(["a-2"]);
  });
});

describe("selectAll and clearGroup", () => {
  const items = [44, 318, 702, 955, 1460].map((n, i) =>
    copy("310z", n, i === 1 ? { transferable: false } : i === 2 ? { reserved: true } : {}),
  );
  const group = groupOf(...items);

  test("checks every available row and skips the rest", () => {
    expect([...selectAll(group, none, 50).keys()]).toEqual(["310z-44", "310z-955", "310z-1460"]);
  });

  test("stops in order when the room runs out", () => {
    const twelve = groupOf(...Array.from({ length: 12 }, (_, i) => copy("101z", 8 + i)));
    expect([...selectAll(twelve, none, 3).keys()]).toEqual(["101z-8", "101z-9", "101z-10"]);
  });

  test("keeps the any control as it is", () => {
    const withAny = groupOf(copy("204z", 615), copy("204z", 1077), anyOf("204z", 4, { hidden: 2 }));
    const draft = withCount(withAny.any!, 2);
    const next = selectAll(withAny, draft, 50);
    expect(next.get(anyKey("204z"))?.count).toBe(2);
    expect(next.size).toBe(3);
  });

  test("clear takes out every copy and the any pick", () => {
    const withAny = groupOf(copy("a", 1), copy("a", 2), anyOf("a", 2, { hidden: 0 }));
    const draft = new Map([...picks(withAny.shown[0]!), ...withCount(withAny.any!, 1)]);
    expect(clearGroup(withAny, draft).size).toBe(0);
  });
});

describe("applyGroup", () => {
  test("replaces only the group's copies and its any key", () => {
    const group = groupOf(copy("a", 1), copy("a", 2), anyOf("a", 2, { hidden: 2 }));
    const otherList = copy("a", 3, { listSlug: "spares" });
    const elsewhere = copy("b", 7);
    const selection = new Map([
      ...picks(group.shown[0]!, otherList, elsewhere),
      ...withCount(group.any!, 2),
    ]);
    const draft = picks(group.shown[1]!);
    const next = applyGroup(selection, group, draft);
    expect([...next.keys()].toSorted()).toEqual(["a-2", "a-3", "b-7"]);
  });

  test("ignores a draft entry that is not the group's", () => {
    const group = groupOf(copy("a", 1), copy("a", 2));
    const next = applyGroup(none, group, picks(copy("a", 1), copy("z", 9)));
    expect([...next.keys()]).toEqual(["a-1"]);
  });
});

describe("dialogFooter and confirmOf", () => {
  const items = [537, 904, 1, 2, 3].map((n) => copy("304z", n));
  const group = groupOf(...items);

  test("picked of available, and the side total with the draft in place of the saved picks", () => {
    // 10 other picks on the side
    const footer = dialogFooter(group, picks(items[0]!, items[1]!), OFFER_SIDE_LIMIT - 10);
    expect(footer).toEqual({ picked: 2, available: 5, sideTotal: 12, full: false });
  });

  test("the side is full when the draft uses the room", () => {
    expect(dialogFooter(group, picks(items[0]!, items[1]!), 2).full).toBe(true);
    expect(dialogFooter(group, picks(items[0]!), 2).full).toBe(false);
  });

  test("available counts the hidden copies of a mixed group, not unavailable ones", () => {
    const mixed = groupOf(
      copy("204z", 615),
      copy("204z", 1077, { reserved: true }),
      anyOf("204z", 3, { hidden: 2 }),
    );
    expect(dialogFooter(mixed, none, 50).available).toBe(3);
  });

  test("confirm: Pick N copies", () => {
    expect(confirmOf(group, picks(items[0]!), none)).toEqual({ kind: "pick", count: 1 });
    expect(confirmOf(group, picks(items[0]!, items[1]!), none)).toEqual({ kind: "pick", count: 2 });
  });

  test("confirm: Remove all when nothing is checked and the collection had picks", () => {
    expect(confirmOf(group, none, picks(items[0]!))).toEqual({ kind: "remove" });
  });

  test("confirm: disabled with nothing picked before or now", () => {
    expect(confirmOf(group, none, none)).toEqual({ kind: "idle" });
  });

  test("the any count counts toward the picked copies", () => {
    const mixed = groupOf(copy("a", 1), anyOf("a", 2, { hidden: 2 }));
    expect(confirmOf(mixed, withCount(mixed.any!, 2), none)).toEqual({
      kind: "pick",
      count: 2,
    });
  });
});

describe("draftOf, dialogRoom, toggleAny and canSelectAll", () => {
  const a = copy("a", 1);
  const b = copy("a", 2, { transferable: false });
  const c = copy("a", 3);
  const group = groupOf(a, b, c, anyOf("a", 3, { bySerial: true }));
  const other = copy("z", 9);

  test("the draft starts from the group's own picks only", () => {
    const selection = picks(a, other);
    expect([...draftOf(group, selection).keys()]).toEqual([toPick(a).key]);
  });

  test("the room is the limit less the picks of other collections, any counts included", () => {
    const selection = new Map([...picks(a, other), ...withCount(anyOf("y", 4), 4)]);
    expect(dialogRoom(group, selection)).toBe(OFFER_SIDE_LIMIT - 1 - 4);
  });

  test("the Any serial checkbox ticks and unticks", () => {
    const ticked = toggleAny(group, none);
    expect(ticked.has(anyKey("a"))).toBe(true);
    expect(toggleAny(group, ticked).has(anyKey("a"))).toBe(false);
  });

  test("select all needs an available row left and room", () => {
    expect(canSelectAll(group, none, 50)).toBe(true);
    expect(canSelectAll(group, picks(a, c), 50)).toBe(false);
    expect(canSelectAll(group, picks(a), 1)).toBe(false);
  });
});

describe("groupItems list order", () => {
  const order = [{ slug: "doubles" }, { slug: "spares" }, { slug: "quiet" }];

  test("SooMin: the lists follow the partner's order, not the items'", () => {
    const group = groupItems(
      [
        anyOf("204z", 4, { hidden: 2, listSlug: "quiet" }),
        copy("204z", 615, { listSlug: "spares" }),
        copy("204z", 1077, { listSlug: "spares" }),
      ],
      order,
    )[0]!;
    expect(group.lists).toEqual(["spares", "quiet"]);
  });

  test("a copy on doubles after one on spares still reads doubles first", () => {
    const group = groupItems(
      [copy("a", 44, { listSlug: "spares" }), copy("a", 100, { listSlug: "doubles" })],
      order,
    )[0]!;
    expect(group.lists).toEqual(["doubles", "spares"]);
  });

  test("a list not in the order goes last, in the order seen; none given keeps the order seen", () => {
    const items = [
      copy("a", 1, { listSlug: "x" }),
      copy("a", 2, { listSlug: "y" }),
      copy("a", 3, { listSlug: "spares" }),
    ];
    expect(groupItems(items, order)[0]!.lists).toEqual(["spares", "x", "y"]);
    expect(groupItems(items)[0]!.lists).toEqual(["x", "y", "spares"]);
  });
});

describe("anyControlOf and the room", () => {
  const shownOnly = groupOf(...[1, 2, 3].map((n) => copy("a", n)), anyOf("a", 3, { hidden: 0 }));
  const mixed = groupOf(copy("204z", 615), anyOf("204z", 4, { hidden: 3 }));

  test("an unchecked checkbox is disabled with no room", () => {
    expect(anyControlOf(shownOnly, none, 0, none)).toMatchObject({
      kind: "checkbox",
      disabled: true,
    });
    expect(anyControlOf(shownOnly, picks(shownOnly.shown[0]!), 1, none)).toMatchObject({
      disabled: true,
    });
  });

  test("a checked checkbox stays enabled at the room, so it can be unchecked", () => {
    expect(anyControlOf(shownOnly, withCount(shownOnly.any!, 1), 1, none)).toEqual({
      kind: "checkbox",
      checked: true,
      disabled: false,
    });
  });

  test("a count's top stops at the room, never below the count held", () => {
    expect(anyControlOf(mixed, none, 2, none)).toEqual({
      kind: "count",
      value: 0,
      top: 2,
      available: 3,
    });
    expect(anyControlOf(mixed, withCount(mixed.any!, 2), 2, none)).toEqual({
      kind: "count",
      value: 2,
      top: 2,
      available: 3,
    });
    expect(anyControlOf(mixed, withCount(mixed.any!, 3), 2, none)).toEqual({
      kind: "count",
      value: 3,
      top: 3,
      available: 3,
    });
    expect(anyControlOf(mixed, none, 0, none)).toEqual({
      kind: "count",
      value: 0,
      top: 0,
      available: 3,
    });
  });
});

describe("selectAll settles a shown-only any pick", () => {
  test("three shown copies with the any pick held at 1: all three serials, the any pick dropped", () => {
    const group = groupOf(...[1, 2, 3].map((n) => copy("a", n)), anyOf("a", 3, { hidden: 0 }));
    const next = selectAll(group, withCount(group.any!, 1), 50);
    expect([...next.keys()]).toEqual(["a-1", "a-2", "a-3"]);
  });
});

describe("anyControlOf beside picks made through another list", () => {
  test("a group read narrowed to a hidden list counts serials of the collection picked elsewhere", () => {
    const group = groupOf(anyOf("a", 4, { hidden: 4, listSlug: "quiet" }));
    const selection = picks(
      copy("a", 1, { listSlug: "spares" }),
      copy("a", 2, { listSlug: "spares" }),
    );
    expect(anyControlOf(group, none, dialogRoom(group, selection), selection)).toMatchObject({
      kind: "count",
      top: 2,
      available: 2,
    });
  });

  test("the draft's own any count does not shrink its top", () => {
    const group = groupOf(anyOf("a", 4, { hidden: 4 }));
    expect(anyControlOf(group, withCount(group.any!, 3), 50, none)).toMatchObject({ top: 4 });
  });
});

describe("anyControlOf near a full side", () => {
  test("the copies available ignore the room, the top does not", () => {
    const group = groupOf(copy("a", 1), anyOf("a", 2, { hidden: 2 }));
    expect(anyControlOf(group, none, 1, none)).toEqual({
      kind: "count",
      value: 0,
      top: 1,
      available: 2,
    });
  });
});

describe("tileOf ratio", () => {
  test("a tile for one copy carries that copy's ratio, not the group's shared one", () => {
    const group = groupOf(copy("a", 1, { ratio: 2 }), anyOf("a", 1, { hidden: 0, bySerial: true }));
    expect(group.ratio).toBeNull();
    const tile = tileOf(group, none, 50);
    expect(tile.kind).toBe("toggle");
    expect(tile.ratio).toBe(2);
  });

  test("a tile for several copies carries the group's shared ratio", () => {
    const shared = groupOf(copy("a", 1, { ratio: 3 }), copy("a", 2, { ratio: 3 }));
    expect(tileOf(shared, none, 50).ratio).toBe(3);
    const mixed = groupOf(copy("a", 1, { ratio: 3 }), copy("a", 2, { ratio: 4 }));
    expect(tileOf(mixed, none, 50).ratio).toBeNull();
  });
});

describe("rowsNameLists", () => {
  test("shown copies all on one list, with an any item on a hidden list: no", () => {
    const group = groupOf(
      copy("a", 1, { listSlug: "WTS" }),
      copy("a", 2, { listSlug: "WTS" }),
      anyOf("a", 3, { hidden: 1, listSlug: "quiet" }),
    );
    expect(group.lists).toHaveLength(2);
    expect(rowsNameLists(group)).toBe(false);
  });

  test("shown copies on two lists: yes", () => {
    const group = groupOf(
      copy("a", 1, { listSlug: "spares" }),
      copy("a", 2, { listSlug: "doubles" }),
    );
    expect(rowsNameLists(group)).toBe(true);
  });
});

describe("an any pick held through a list the group does not show", () => {
  // the picker narrowed to "spares": one shown copy, and an any item scoped to that list
  const narrowed = groupOf(
    copy("a", 200, { listSlug: "spares" }),
    anyOf("a", 1, { hidden: 0, bySerial: true, listSlug: "spares" }),
  );
  const elsewhere = withCount(anyOf("a", 3, { hidden: 2, listSlug: "extras" }), 2);

  test("the group neither counts it nor offers Any serial over it", () => {
    expect(anyElsewhere(narrowed, elsewhere)).toBe(true);
    expect(tileOf(narrowed, elsewhere, 48)).toMatchObject({ kind: "toggle", mark: null });
    expect(anyControlOf(narrowed, draftOf(narrowed, elsewhere), 48, elsewhere)).toEqual({
      kind: "none",
    });
    expect(draftOf(narrowed, elsewhere).size).toBe(0);
  });

  test("confirming or clearing the shown copy keeps it", () => {
    const [shown] = narrowed.shown;
    const applied = applyGroup(elsewhere, narrowed, picks(shown!));
    expect(applied.get(anyKey("a"))?.count).toBe(2);
    expect(applied.has(shown!.objektId!)).toBe(true);
    expect(applyGroup(applied, narrowed, none).get(anyKey("a"))?.count).toBe(2);
    expect(dialogRoom(narrowed, applied)).toBe(OFFER_SIDE_LIMIT - 2);
  });

  test("a pick through one of the group's lists is its own", () => {
    const all = groupOf(
      copy("a", 200, { listSlug: "spares" }),
      anyOf("a", 3, { hidden: 2, listSlug: "extras" }),
    );
    expect(anyElsewhere(all, elsewhere)).toBe(false);
    expect(draftOf(all, elsewhere).size).toBe(1);
  });
});
