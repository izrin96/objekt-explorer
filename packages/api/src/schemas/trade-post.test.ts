import { describe, expect, test } from "bun:test";

import { flagsOf } from "./open-to";
import {
  choiceTags,
  composerWrites,
  type PlanList,
  planPost,
  postKindOf,
  rowBlock,
  startForList,
  startForPost,
  tagsOf,
  tradeLineOf,
} from "./trade-post";

const SWAPS = flagsOf("swaps");
const BOTH = flagsOf("both");
const BUYING = flagsOf("buying");

let nextId = 1;
function list(patch: Partial<PlanList> & Pick<PlanList, "listType" | "slug">): PlanList {
  return {
    id: nextId++,
    name: patch.slug,
    linkedListId: null,
    takesSwaps: false,
    discoverable: false,
    isProfileBind: patch.listType !== "want",
    ...flagsOf(patch.listType === "want" ? "swaps" : "both"),
    ...patch,
  };
}

/** Links two lists both ways, as the database holds a pair. */
function pair(have: PlanList, want: PlanList) {
  have.linkedListId = want.id;
  want.linkedListId = have.id;
}

describe("tagsOf and postKindOf", () => {
  const have = {};
  const rows: [string, Parameters<typeof tagsOf>[0], string[], string, boolean][] = [
    ["have alone", { have, want: null, sale: null }, ["wtt"], "swap", false],
    ["have + swaps want", { have, want: SWAPS, sale: null }, ["wtt"], "swap", false],
    ["have + both want", { have, want: BOTH, sale: null }, ["wtt", "wtb"], "swap", true],
    [
      "have + pre-rule buying want",
      { have, want: BUYING, sale: null },
      ["wtt", "wtb"],
      "swap",
      true,
    ],
    ["want alone, swaps", { have: null, want: SWAPS, sale: null }, ["wtt"], "swap", false],
    ["want alone, both", { have: null, want: BOTH, sale: null }, ["wtt", "wtb"], "swap", true],
    ["want alone, buying", { have: null, want: BUYING, sale: null }, ["wtb"], "buy", false],
    ["sale", { have: null, want: null, sale: {} }, ["wts"], "sell", false],
  ];
  for (const [name, post, tags, kind, alsoPay] of rows) {
    test(name, () => {
      expect(tagsOf(post)).toEqual(tags as never);
      expect(postKindOf(post)).toEqual({ kind: kind as never, alsoPay, alsoSwap: false });
    });
  }

  test("a row open to nothing reads as Buying only, as openToOf does", () => {
    expect(
      tagsOf({ have: null, want: { matchSale: false, matchHave: false }, sale: null }),
    ).toEqual(["wtb"]);
  });
});

describe("composerWrites", () => {
  const none = { have: false, want: false, sale: false };

  test("Swap with both lists links them, open to swaps only", () => {
    expect(composerWrites({ ...none, kind: "swap", have: true, want: true })).toEqual({
      ok: true,
      wantFlags: SWAPS,
      link: true,
      saleSwaps: null,
    });
  });

  test("Swap that would also pay saves Swaps or buying, tagged WTT and WTB", () => {
    const choice = { ...none, kind: "swap" as const, want: true, alsoPay: true };
    expect(composerWrites(choice)).toEqual({
      ok: true,
      wantFlags: BOTH,
      link: false,
      saleSwaps: null,
    });
    expect(choiceTags(choice)).toEqual(["wtt", "wtb"]);
  });

  test("Swap with one have list: also pay has nothing to set", () => {
    const choice = { ...none, kind: "swap" as const, have: true, alsoPay: true };
    expect(composerWrites(choice)).toEqual({
      ok: true,
      wantFlags: null,
      link: false,
      saleSwaps: null,
    });
    expect(choiceTags(choice)).toEqual(["wtt"]);
  });

  test("Buy saves Buying only, tagged WTB", () => {
    const choice = { ...none, kind: "buy" as const, want: true };
    expect(composerWrites(choice)).toEqual({
      ok: true,
      wantFlags: BUYING,
      link: false,
      saleSwaps: null,
    });
    expect(choiceTags(choice)).toEqual(["wtb"]);
  });

  test("Sell takes one sale list, tagged WTS", () => {
    expect(composerWrites({ ...none, kind: "sell", sale: true })).toMatchObject({ ok: true });
    expect(choiceTags({ ...none, kind: "sell", sale: true })).toEqual(["wts"]);
  });

  test("nothing picked, or a list the kind doesn't take, is refused", () => {
    expect(composerWrites({ ...none, kind: "swap" })).toEqual({
      ok: false,
      reason: "trade_post_empty",
    });
    expect(composerWrites({ ...none, kind: "buy", have: true, want: true })).toEqual({
      ok: false,
      reason: "trade_post_wrong_type",
    });
    expect(composerWrites({ ...none, kind: "sell", want: true })).toEqual({
      ok: false,
      reason: "trade_post_wrong_type",
    });
    expect(composerWrites({ ...none, kind: "swap", sale: true })).toEqual({
      ok: false,
      reason: "trade_post_wrong_type",
    });
  });
});

describe("planPost", () => {
  test("Swap with both lists puts both on Trade and links them", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want", ...BOTH });
    const plan = planPost([spares, hunt], { kind: "swap", have: "spares", want: "hunt" });
    expect(plan).toEqual({
      ok: true,
      on: [
        { id: spares.id, flags: null },
        { id: hunt.id, flags: SWAPS },
      ],
      saleSwaps: null,
      off: [],
      link: [spares.id, hunt.id],
      unlink: [],
    });
  });

  test("a pre-rule Buying only pair posted as Swap saves the want side open to swaps", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const store = list({ slug: "store", listType: "want", discoverable: true, ...BUYING });
    pair(spares, store);
    const plan = planPost([spares, store], {
      kind: "swap",
      have: "spares",
      want: "store",
      alsoPay: true,
      alsoSwap: false,
      replaces: "spares",
    });
    expect(plan).toMatchObject({ ok: true, on: [{}, { id: store.id, flags: BOTH }], off: [] });
  });

  test("an unknown slug, a wrong type and an unbound have list are refused", () => {
    const loose = list({ slug: "loose", listType: "have", isProfileBind: false });
    const hunt = list({ slug: "hunt", listType: "want" });
    expect(planPost([loose, hunt], { kind: "swap", have: "nope" })).toMatchObject({
      reason: "not_found",
    });
    expect(planPost([loose, hunt], { kind: "swap", have: "hunt" })).toMatchObject({
      reason: "trade_post_wrong_type",
    });
    expect(planPost([loose, hunt], { kind: "swap", have: "loose" })).toMatchObject({
      reason: "trade_post_needs_profile",
      slug: "loose",
    });
  });

  test("a list in another post on Trade is refused; in the post being edited it passes", () => {
    const store = list({ slug: "store", listType: "want", discoverable: true, ...BUYING });
    expect(planPost([store], { kind: "swap", want: "store" })).toMatchObject({
      reason: "trade_post_list_in_post",
      slug: "store",
    });
    expect(planPost([store], { kind: "swap", want: "store", replaces: "store" })).toMatchObject({
      ok: true,
      on: [{ id: store.id, flags: SWAPS }],
    });
  });

  test("a paired want list for a Buy post asks to unpair, and unpair clears both halves", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(spares, hunt);
    expect(planPost([spares, hunt], { kind: "buy", want: "hunt" })).toEqual({
      ok: false,
      reason: "trade_post_list_paired",
      slug: "hunt",
      partner: "spares",
    });
    expect(planPost([spares, hunt], { kind: "buy", want: "hunt", unpair: true })).toEqual({
      ok: true,
      on: [{ id: hunt.id, flags: BUYING }],
      saleSwaps: null,
      off: [],
      link: null,
      unlink: [hunt.id, spares.id],
    });
  });

  test("a Swap pair with another partner asks to unpair", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want" });
    const other = list({ slug: "other", listType: "want" });
    pair(spares, hunt);
    expect(
      planPost([spares, hunt, other], { kind: "swap", have: "spares", want: "other" }),
    ).toEqual({ ok: false, reason: "trade_post_list_paired", slug: "spares", partner: "hunt" });
  });

  test("a one-list Swap post keeps its pair, the partner staying off Trade", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true });
    pair(spares, hunt);
    expect(
      planPost([spares, hunt], { kind: "swap", want: "hunt", alsoPay: true, replaces: "hunt" }),
    ).toEqual({
      ok: true,
      on: [{ id: hunt.id, flags: BOTH }],
      saleSwaps: null,
      off: [],
      link: null,
      unlink: [],
    });
  });

  test("a one-list Swap post whose partner is in another post is refused", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(spares, hunt);
    expect(planPost([spares, hunt], { kind: "swap", want: "hunt" })).toMatchObject({
      reason: "trade_post_list_in_post",
      slug: "spares",
    });
  });

  test("Edit post dropping the have list takes it off Trade and unlinks it", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true });
    pair(spares, hunt);
    expect(planPost([spares, hunt], { kind: "swap", want: "hunt", replaces: "spares" })).toEqual({
      ok: true,
      on: [{ id: hunt.id, flags: SWAPS }],
      saleSwaps: null,
      off: [spares.id],
      link: null,
      unlink: [hunt.id, spares.id],
    });
  });

  test("Edit post turning a Swap pair into a Buy post unlinks the dropped half without asking", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true });
    pair(spares, hunt);
    expect(planPost([spares, hunt], { kind: "buy", want: "hunt", replaces: "spares" })).toEqual({
      ok: true,
      on: [{ id: hunt.id, flags: BUYING }],
      saleSwaps: null,
      off: [spares.id],
      link: null,
      unlink: [hunt.id, spares.id],
    });
  });

  test("Edit post replacing both lists keeps the dropped pair linked", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true });
    const sale = list({ slug: "sale", listType: "sale" });
    pair(spares, hunt);
    expect(
      planPost([spares, hunt, sale], { kind: "sell", sale: "sale", replaces: "spares" }),
    ).toEqual({
      ok: true,
      on: [{ id: sale.id, flags: null }],
      saleSwaps: { id: sale.id, takesSwaps: false },
      off: [spares.id, hunt.id],
      link: null,
      unlink: [],
    });
  });
});

describe("composer rows and starts", () => {
  test("a list in another post is blocked, naming that post's kind; the edited post's own pass", () => {
    const store = list({ slug: "store", listType: "want", discoverable: true, ...BUYING });
    const loose = list({ slug: "loose", listType: "have", isProfileBind: false });
    const lists = [store, loose];
    expect(rowBlock(lists, store, "swap", null)).toEqual({
      reason: "in_post",
      kind: "buy",
      slug: "store",
    });
    expect(rowBlock(lists, store, "buy", "store")).toBeNull();
    expect(rowBlock(lists, loose, "swap", null)).toEqual({ reason: "needs_profile" });
  });

  test("on a Swap post, a partner in another post blocks only while the other side is empty", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const store = list({ slug: "store", listType: "want", discoverable: true, ...BUYING });
    const hunt = list({ slug: "hunt", listType: "want", ...SWAPS });
    pair(spares, store);
    const lists = [spares, store, hunt];
    expect(rowBlock(lists, spares, "swap", null)).toEqual({
      reason: "in_post",
      kind: "buy",
      slug: "store",
    });
    expect(rowBlock(lists, spares, "swap", null, true)).toBeNull();
    // and the server agrees: with the other side picked, the pair splits by unpairing
    expect(planPost(lists, { kind: "swap", have: "spares", want: "hunt" })).toMatchObject({
      ok: false,
      reason: "trade_post_list_paired",
    });
    expect(
      planPost(lists, { kind: "swap", have: "spares", want: "hunt", unpair: true }),
    ).toMatchObject({ ok: true, link: [spares.id, hunt.id] });
  });

  test("Edit post opens on the post's kind and lists", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true, ...BOTH });
    pair(spares, hunt);
    expect(startForPost([spares, hunt], "spares")).toEqual({
      kind: "swap",
      have: "spares",
      want: "hunt",
      sale: null,
      alsoPay: true,
      alsoSwap: false,
      replaces: "spares",
    });
    expect(startForList([spares, hunt], "hunt")).toEqual(startForPost([spares, hunt], "spares"));
  });

  test("Post it on a paired list off Trade opens a Swap post with both", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(spares, hunt);
    expect(startForList([spares, hunt], "hunt")).toMatchObject({
      kind: "swap",
      have: "spares",
      want: "hunt",
      alsoSwap: false,
      replaces: null,
    });
  });

  test("Post it on a list whose partner is in a post edits that post with the list added", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(spares, hunt);
    expect(startForList([spares, hunt], "hunt")).toMatchObject({
      kind: "swap",
      have: "spares",
      want: "hunt",
      alsoSwap: false,
      replaces: "spares",
    });
  });

  test("Post it on a want list open to buying whose have list is posted keeps also pay", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", ...BOTH });
    pair(spares, hunt);
    expect(startForList([spares, hunt], "hunt")).toMatchObject({
      kind: "swap",
      want: "hunt",
      alsoPay: true,
      alsoSwap: false,
      replaces: "spares",
    });
  });

  test("a lone have list starts on Swap, a lone want list on the kind step", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want" });
    expect(startForList([spares, hunt], "spares")).toMatchObject({ kind: "swap", have: "spares" });
    expect(startForList([spares, hunt], "hunt")).toMatchObject({ kind: null, want: "hunt" });
  });
});

describe("tradeLineOf", () => {
  test("in a Swap post that would also pay", () => {
    const spares = list({ slug: "spares", listType: "have", discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true, ...BOTH });
    pair(spares, hunt);
    expect(tradeLineOf([spares, hunt], hunt)).toEqual({
      state: "in_post",
      kind: "swap",
      tags: ["wtt", "wtb"],
      alsoPay: true,
      partner: spares,
    });
  });

  test("paired off Trade, alone off Trade, and unbound", () => {
    const spares = list({ slug: "spares", listType: "have" });
    const hunt = list({ slug: "hunt", listType: "want" });
    const lone = list({ slug: "lone", listType: "want" });
    const loose = list({ slug: "loose", listType: "have", isProfileBind: false });
    pair(spares, hunt);
    const lists = [spares, hunt, lone, loose];
    expect(tradeLineOf(lists, hunt)).toEqual({ state: "paired_off", partner: spares });
    expect(tradeLineOf(lists, lone)).toEqual({ state: "off" });
    expect(tradeLineOf(lists, loose)).toEqual({ state: "needs_profile" });
  });
});

describe("Sell or swap", () => {
  test("a sale list that takes swaps is tagged WTS then WTT, alone or paired", () => {
    expect(tagsOf({ have: null, want: null, sale: { takesSwaps: true } })).toEqual(["wts", "wtt"]);
    expect(tagsOf({ have: null, want: SWAPS, sale: { takesSwaps: true } })).toEqual(["wts", "wtt"]);
    expect(tagsOf({ have: null, want: null, sale: { takesSwaps: false } })).toEqual(["wts"]);
    expect(postKindOf({ have: null, want: SWAPS, sale: { takesSwaps: true } })).toEqual({
      kind: "sell",
      alsoPay: false,
      alsoSwap: true,
    });
  });

  test("a want list on a Sell post needs Also open to swaps, and saves Swaps only", () => {
    const choice = { kind: "sell" as const, have: false, want: true, sale: true };
    expect(composerWrites(choice)).toEqual({ ok: false, reason: "trade_post_wrong_type" });
    expect(composerWrites({ ...choice, alsoSwap: true })).toEqual({
      ok: true,
      wantFlags: SWAPS,
      link: true,
      saleSwaps: true,
    });
    expect(choiceTags({ ...choice, alsoSwap: true })).toEqual(["wts", "wtt"]);
  });

  test("a Sell post with a want list links the pair and turns swaps on", () => {
    const sale = list({ slug: "binary-sale", listType: "sale" });
    const hunt = list({ slug: "binary-hunt", listType: "want" });
    expect(
      planPost([sale, hunt], {
        kind: "sell",
        sale: "binary-sale",
        want: "binary-hunt",
        alsoSwap: true,
      }),
    ).toMatchObject({
      ok: true,
      link: [sale.id, hunt.id],
      saleSwaps: { id: sale.id, takesSwaps: true },
      on: [
        { id: hunt.id, flags: SWAPS },
        { id: sale.id, flags: null },
      ],
    });
  });

  test("unticking swaps on a paired sale list asks to unpair", () => {
    const sale = list({ slug: "stock", listType: "sale", takesSwaps: true, discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(sale, hunt);
    expect(
      planPost([sale, hunt], { kind: "sell", sale: "stock", alsoSwap: false, replaces: "stock" }),
    ).toMatchObject({
      ok: false,
      reason: "trade_post_list_paired",
      slug: "stock",
      partner: "hunt",
    });
    expect(
      planPost([sale, hunt], {
        kind: "sell",
        sale: "stock",
        alsoSwap: false,
        unpair: true,
        replaces: "stock",
      }),
    ).toMatchObject({ ok: true, unlink: [sale.id, hunt.id], saleSwaps: { takesSwaps: false } });
  });

  test("a one-list Sell post that takes swaps keeps its pair", () => {
    const sale = list({ slug: "stock", listType: "sale", takesSwaps: true });
    const hunt = list({ slug: "hunt", listType: "want" });
    pair(sale, hunt);
    expect(planPost([sale, hunt], { kind: "sell", sale: "stock", alsoSwap: true })).toMatchObject({
      ok: true,
      unlink: [],
    });
    expect(startForList([sale, hunt], "hunt")).toMatchObject({
      kind: "sell",
      sale: "stock",
      want: "hunt",
      alsoSwap: true,
    });
  });
});

describe("Sell that would also pay", () => {
  const choice = { kind: "sell" as const, have: false, want: true, sale: true, alsoSwap: true };

  test("saves the want list Swaps or buying and tags WTS, WTT, WTB", () => {
    expect(composerWrites({ ...choice, alsoPay: true })).toEqual({
      ok: true,
      wantFlags: BOTH,
      link: true,
      saleSwaps: true,
    });
    expect(choiceTags({ ...choice, alsoPay: true })).toEqual(["wts", "wtt", "wtb"]);
    expect(tagsOf({ have: null, want: BOTH, sale: { takesSwaps: true } })).toEqual([
      "wts",
      "wtt",
      "wtb",
    ]);
  });

  test("without also pay it stays WTS, WTT", () => {
    expect(composerWrites({ ...choice, alsoPay: false })).toMatchObject({ wantFlags: SWAPS });
    expect(choiceTags({ ...choice, alsoPay: false })).toEqual(["wts", "wtt"]);
  });

  test("also pay with no want list writes no want list", () => {
    expect(composerWrites({ ...choice, want: false, alsoPay: true })).toEqual({
      ok: true,
      wantFlags: null,
      link: false,
      saleSwaps: true,
    });
    expect(choiceTags({ ...choice, want: false, alsoPay: true })).toEqual(["wts", "wtt"]);
  });

  test("an existing post reads it back", () => {
    expect(postKindOf({ have: null, want: BOTH, sale: { takesSwaps: true } })).toEqual({
      kind: "sell",
      alsoPay: true,
      alsoSwap: true,
    });
    const sale = list({ slug: "stock", listType: "sale", takesSwaps: true, discoverable: true });
    const hunt = list({ slug: "hunt", listType: "want", ...BOTH, discoverable: true });
    pair(sale, hunt);
    expect(startForPost([sale, hunt], "stock")).toMatchObject({
      kind: "sell",
      want: "hunt",
      alsoPay: true,
      alsoSwap: true,
    });
    expect(
      planPost([sale, hunt], {
        kind: "sell",
        sale: "stock",
        want: "hunt",
        alsoSwap: true,
        alsoPay: true,
        replaces: "stock",
      }),
    ).toMatchObject({ ok: true, on: [{ id: hunt.id, flags: BOTH }, { id: sale.id }] });
  });
});

describe("Posting a sale pair from a list page", () => {
  test("a pair off Trade opens as Sell and keeps also pay", () => {
    const sale = list({ slug: "stock", listType: "sale", takesSwaps: true });
    const hunt = list({ slug: "hunt", listType: "want", ...BOTH });
    pair(sale, hunt);
    const start = startForList([sale, hunt], "stock");
    expect(start).toMatchObject({ kind: "sell", sale: "stock", want: "hunt", alsoPay: true });
    expect(planPost([sale, hunt], { ...start, kind: "sell" })).toMatchObject({
      ok: true,
      on: [{ id: hunt.id, flags: BOTH }, { id: sale.id }],
    });
  });

  test("a sale list joins its want list's post as a Sell", () => {
    const sale = list({ slug: "stock", listType: "sale", takesSwaps: true });
    const hunt = list({ slug: "hunt", listType: "want", discoverable: true });
    pair(sale, hunt);
    const start = startForList([sale, hunt], "stock");
    expect(start).toMatchObject({
      kind: "sell",
      sale: "stock",
      want: "hunt",
      alsoSwap: true,
      replaces: "hunt",
    });
    expect(planPost([sale, hunt], { ...start, kind: "sell" })).toMatchObject({ ok: true });
  });
});
