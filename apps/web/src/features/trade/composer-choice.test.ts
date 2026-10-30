import { describe, expect, test } from "bun:test";

import { savePostInputSchema } from "@repo/api/schemas/trade";
import { type PlanList, type PostPlan, planPost, startForPost } from "@repo/api/schemas/trade-post";

import {
  type Choice,
  choiceForKind,
  otherSlot,
  pairedPartner,
  pickList,
  postInput,
  unpairedNames,
  withAlsoSwap,
} from "./composer-choice";

let nextId = 1;
const list = (over: Partial<PlanList> & Pick<PlanList, "slug" | "listType">): PlanList => ({
  id: nextId++,
  name: over.slug,
  linkedListId: null,
  takesSwaps: false,
  matchSale: false,
  matchHave: true,
  discoverable: false,
  isProfileBind: true,
  ...over,
});

const choice = (over: Partial<Choice> = {}): Choice => ({
  kind: "swap",
  have: null,
  want: null,
  sale: null,
  alsoPay: false,
  alsoSwap: false,
  unpair: false,
  ...over,
});

const REPO = [
  list({ id: 1, slug: "h1", listType: "have", linkedListId: 2 }),
  list({ id: 2, slug: "w1", listType: "want", linkedListId: 1 }),
  list({ id: 3, slug: "h2", listType: "have" }),
  list({ id: 4, slug: "w2", listType: "want" }),
  list({ id: 5, slug: "s1", listType: "sale", takesSwaps: true, linkedListId: 6 }),
  list({ id: 6, slug: "w3", listType: "want", linkedListId: 5 }),
  // a want list whose partner is a sale list
  list({ id: 7, slug: "w4", listType: "want", linkedListId: 8 }),
  list({ id: 8, slug: "s2", listType: "sale", takesSwaps: true, linkedListId: 7 }),
];

describe("postInput", () => {
  // a request the server would accept, planned the same before and after the wire
  const build = (c: Partial<Choice>, replaces: string | null = null, lists = REPO) => {
    const input = postInput({ ...choice(c), kind: c.kind ?? "swap" }, replaces);
    expect(savePostInputSchema.safeParse(input).success).toBe(true);
    expect(planPost(lists, input)).toEqual(planPost(lists, savePostInputSchema.parse(input)));
    return input;
  };

  test("swap with both lists and pay", () => {
    const input = build({ have: "h2", want: "w2", alsoPay: true });
    expect(input).toMatchObject({ have: "h2", want: "w2", alsoPay: true });
  });

  test("swap with no want sends alsoPay false", () => {
    expect(build({ have: "h2", alsoPay: true }).alsoPay).toBe(false);
  });

  test("sell without swaps sends no want and no pay", () => {
    const input = build({ kind: "sell", sale: "s1", want: "w3", alsoPay: true });
    expect(input.want).toBeNull();
    expect(input.alsoPay).toBe(false);
    expect(input.alsoSwap).toBe(false);
  });

  test("sell with swaps keeps the want and pay", () => {
    const input = build({ kind: "sell", sale: "s1", want: "w3", alsoPay: true, alsoSwap: true });
    expect(input).toMatchObject({ want: "w3", alsoPay: true, alsoSwap: true });
  });

  test("buy sends alsoPay false", () => {
    const input = build({ kind: "buy", want: "w2", alsoPay: true });
    expect(input.alsoPay).toBe(false);
  });

  test("replaces and unpair pass through", () => {
    const input = build({ have: "h1", unpair: true }, "h1");
    expect(input).toMatchObject({ replaces: "h1", unpair: true });
  });

  test("swap and buy send alsoSwap undefined, which parses to false", () => {
    for (const kind of ["swap", "buy"] as const) {
      const input = build({ kind, want: "w2", alsoSwap: true });
      expect(input.alsoSwap).toBeUndefined();
      expect(savePostInputSchema.parse(input).alsoSwap).toBe(false);
    }
  });

  test("a sell start carrying a have sends it, and planPost refuses it", () => {
    const input = build({ kind: "sell", sale: "s1", have: "h2" });
    expect(input.have).toBe("h2");
    expect(planPost(REPO, input)).toEqual({ ok: false, reason: "trade_post_wrong_type" });
  });

  test("a composer start with its kind set satisfies the parameter", () => {
    const start = {
      kind: "buy" as const,
      have: null,
      want: "w2",
      sale: null,
      alsoPay: true,
      alsoSwap: false,
      replaces: null,
    };
    expect(postInput(start, null)).toMatchObject({ kind: "buy", want: "w2", alsoPay: false });
  });
});

describe("otherSlot", () => {
  test("a have or sale list brings the want list, a want list the side its kind offers", () => {
    expect(otherSlot("swap", "have")).toBe("want");
    expect(otherSlot("sell", "sale")).toBe("want");
    expect(otherSlot("swap", "want")).toBe("have");
    expect(otherSlot("sell", "want")).toBe("sale");
  });
});

describe("choiceForKind", () => {
  test("swap to buy drops the have", () => {
    const next = choiceForKind(choice({ have: "h2", want: "w2" }), "buy");
    expect(next).toMatchObject({ kind: "buy", have: null, want: "w2" });
  });

  test("swap to sell drops the have and keeps the want", () => {
    const next = choiceForKind(choice({ have: "h2", want: "w2" }), "sell");
    expect(next).toMatchObject({ kind: "sell", have: null, want: "w2" });
  });

  test("keeps alsoPay and alsoSwap, resets unpair", () => {
    const next = choiceForKind(choice({ alsoPay: true, alsoSwap: true, unpair: true }), "sell");
    expect(next).toMatchObject({ alsoPay: true, alsoSwap: true, unpair: false });
  });
});

describe("pickList", () => {
  test("a paired have on swap fills an empty want", () => {
    const next = pickList(REPO, choice(), "swap", "have", "h1", null);
    expect(next).toMatchObject({ have: "h1", want: "w1" });
  });

  test("it does not overwrite a want already picked", () => {
    const next = pickList(REPO, choice({ want: "w2" }), "swap", "have", "h1", null);
    expect(next).toMatchObject({ have: "h1", want: "w2" });
  });

  test("buy fills nothing", () => {
    const next = pickList(REPO, choice({ kind: "buy" }), "buy", "want", "w1", null);
    expect(next).toMatchObject({ want: "w1", have: null, sale: null });
  });

  test("sell fills only with swaps", () => {
    const off = pickList(REPO, choice({ kind: "sell" }), "sell", "sale", "s1", null);
    expect(off).toMatchObject({ sale: "s1", want: null });
    const on = pickList(REPO, choice({ kind: "sell", alsoSwap: true }), "sell", "sale", "s1", null);
    expect(on).toMatchObject({ sale: "s1", want: "w3" });
  });

  test("a want whose partner is a sale list fills nothing on swap", () => {
    const next = pickList(REPO, choice(), "swap", "want", "w4", null);
    expect(next).toMatchObject({ want: "w4", have: null, sale: null });
  });

  test("a want whose partner is a sale list fills the sale on sell with swaps", () => {
    const next = pickList(
      REPO,
      choice({ kind: "sell", alsoSwap: true }),
      "sell",
      "want",
      "w4",
      null,
    );
    expect(next).toMatchObject({ want: "w4", sale: "s2" });
  });

  test("a partner in another post fills nothing", () => {
    const posted = REPO.map((l) => (l.id === 1 || l.id === 2 ? { ...l, discoverable: true } : l));
    const next = pickList(posted, choice(), "swap", "want", "w1", null);
    expect(next).toMatchObject({ want: "w1", have: null });
  });

  test("a partner in the post being edited is filled", () => {
    const posted = REPO.map((l) => (l.id === 1 || l.id === 2 ? { ...l, discoverable: true } : l));
    const next = pickList(posted, choice(), "swap", "want", "w1", "h1");
    expect(next).toMatchObject({ want: "w1", have: "h1" });
  });

  test("clearing the want resets alsoPay", () => {
    const next = pickList(REPO, choice({ want: "w2", alsoPay: true }), "swap", "want", null, null);
    expect(next).toMatchObject({ want: null, alsoPay: false });
  });

  test("a pick resets unpair", () => {
    const next = pickList(REPO, choice({ unpair: true }), "swap", "have", "h2", null);
    expect(next.unpair).toBe(false);
  });
});

describe("withAlsoSwap", () => {
  test("off clears the want and alsoPay", () => {
    const next = withAlsoSwap(choice({ want: "w3", alsoPay: true, alsoSwap: true }), false);
    expect(next).toMatchObject({ alsoSwap: false, want: null, alsoPay: false });
  });

  test("on keeps the want", () => {
    const next = withAlsoSwap(choice({ want: "w3", alsoPay: true, unpair: true }), true);
    expect(next).toMatchObject({ alsoSwap: true, want: "w3", alsoPay: true, unpair: false });
  });
});

describe("pairedPartner and unpairedNames", () => {
  const refused = planPost(REPO, { kind: "swap", have: "h1", want: "w2" });

  test("the refused list's slug names its partner", () => {
    expect(refused).toMatchObject({ ok: false, reason: "trade_post_list_paired" });
    expect(pairedPartner(refused, "h1", REPO)).toBe("w1");
  });

  test("a different slug, or a plan that is not that refusal, names nobody", () => {
    expect(pairedPartner(refused, "w2", REPO)).toBeNull();
    expect(pairedPartner(refused, null, REPO)).toBeNull();
    const ok = planPost(REPO, { kind: "swap", have: "h2" });
    expect(pairedPartner(ok, "h2", REPO)).toBeNull();
  });

  const unpaired = planPost(REPO, { kind: "swap", have: "h1", want: "w2", unpair: true });
  const okPlan = (plan: PostPlan) => {
    if (!plan.ok) throw new Error("expected a plan");
    return plan;
  };

  test("names the lists the post unpairs, leaving the picked ones out", () => {
    const plan = okPlan(unpaired);
    const names = unpairedNames(REPO, plan, { have: "h1", want: "w2", sale: null });
    expect(names).toEqual(["w1"]);
  });

  test("lists nobody when every unlinked list is picked", () => {
    const plan = okPlan(unpaired);
    expect(unpairedNames(REPO, plan, { have: "h1", want: "w1", sale: null })).toEqual([]);
  });
});

describe("undo after take down", () => {
  const posted = [
    list({
      id: 21,
      slug: "s9",
      listType: "sale",
      takesSwaps: true,
      linkedListId: 22,
      discoverable: true,
    }),
    list({ id: 22, slug: "w9", listType: "want", linkedListId: 21, discoverable: true }),
    list({ id: 23, slug: "s8", listType: "sale", takesSwaps: true, discoverable: true }),
  ];
  const takenDown = posted.map((entry) => ({ ...entry, discoverable: false }));
  const undo = (slug: string) => {
    const start = startForPost(posted, slug);
    if (!start.kind) throw new Error(`no post for ${slug}`);
    return postInput({ ...start, kind: start.kind }, null);
  };

  test("a Sell post that takes swaps comes back with its want list", () => {
    const plan = planPost(takenDown, undo("s9"));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.saleSwaps).toEqual({ id: 21, takesSwaps: true });
    expect(plan.on.map((entry) => entry.id).toSorted((a, b) => a - b)).toEqual([21, 22]);
  });

  test("a sale list posted alone still takes swaps", () => {
    const plan = planPost(takenDown, undo("s8"));
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.saleSwaps).toEqual({ id: 23, takesSwaps: true });
  });
});
