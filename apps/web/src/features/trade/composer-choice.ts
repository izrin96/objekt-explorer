import {
  type PlanList,
  type PostChoice,
  type PostKind,
  type PostPlan,
  keepsPair,
  partnerOf,
  rowBlock,
} from "@repo/api/schemas/trade-post";

import type { Slot } from "./post-kind-text";

export type Choice = {
  kind: PostKind | null;
  have: string | null;
  want: string | null;
  sale: string | null;
  alsoPay: boolean;
  alsoSwap: boolean;
  unpair: boolean;
};

export const SLOTS_OF: Record<PostKind, Slot[]> = {
  swap: ["have", "want"],
  // the want list only once the sale list takes swaps: it is what the seller would swap for
  sell: ["sale", "want"],
  buy: ["want"],
};

/** The half a picked list's partner fills: a want list's is the have list, or on a Sell post the
 * sale list. */
export function otherSlot(kind: PostKind, slot: Slot): Slot {
  return slot !== "want" ? "want" : kind === "sell" ? "sale" : "have";
}

/** Choosing a kind keeps the lists it takes and drops the rest. */
export function choiceForKind(prev: Choice, kind: PostKind): Choice {
  const keeps = SLOTS_OF[kind];
  return {
    ...prev,
    kind,
    have: keeps.includes("have") ? prev.have : null,
    want: keeps.includes("want") ? prev.want : null,
    sale: keeps.includes("sale") ? prev.sale : null,
    unpair: false,
  };
}

/** Picks (or clears) a slot's list. */
export function pickList(
  lists: PlanList[],
  prev: Choice,
  kind: PostKind,
  slot: Slot,
  slug: string | null,
  replaces: string | null,
): Choice {
  const next = { ...prev, [slot]: slug, unpair: false };
  if (slot === "want" && slug === null) next.alsoPay = false;
  // one half of a pair brings the other along on a post that keeps it, unless that side is taken
  const other = otherSlot(kind, slot);
  const list = lists.find((entry) => entry.slug === slug);
  const partner =
    list && keepsPair(kind, prev.alsoSwap) && prev[other] === null ? partnerOf(lists, list) : null;
  // a want list's partner may be a have or a sale list; only one that fits the slot comes along
  if (partner && partner.listType === other && rowBlock(lists, partner, kind, replaces) === null) {
    next[other] = partner.slug;
  }
  return next;
}

/** Sell's "also open to swaps": off drops the want list and its pay option. */
export function withAlsoSwap(prev: Choice, on: boolean): Choice {
  return {
    ...prev,
    alsoSwap: on,
    want: on ? prev.want : null,
    alsoPay: on && prev.alsoPay,
    unpair: false,
  };
}

/** What the composer sends and plans: a Sell post without swaps has no want list, and only a post
 * with a want list that swaps can also pay. */
export type PostInput = PostChoice & {
  have: string | null;
  want: string | null;
  sale: string | null;
  alsoPay: boolean;
  unpair: boolean;
  replaces: string | null;
};

export function postInput(
  choice: Omit<Choice, "kind" | "unpair"> & { kind: PostKind; unpair?: boolean },
  replaces: string | null,
): PostInput {
  const { kind } = choice;
  const sellSwaps = kind === "sell" && choice.alsoSwap;
  return {
    kind,
    have: choice.have,
    want: kind === "sell" && !choice.alsoSwap ? null : choice.want,
    sale: choice.sale,
    alsoPay: (kind === "swap" || sellSwaps) && choice.want !== null && choice.alsoPay,
    alsoSwap: kind === "sell" ? choice.alsoSwap : undefined,
    unpair: choice.unpair ?? false,
    replaces,
  };
}

/** The name of the partner the plan refused `slug` over, for the unpair prompt. */
export function pairedPartner(plan: PostPlan, slug: string | null, lists: PlanList[]) {
  if (plan.ok || plan.reason !== "trade_post_list_paired" || plan.slug !== slug || !plan.partner) {
    return null;
  }
  return lists.find((list) => list.slug === plan.partner)?.name ?? "";
}

/** Names the lists posting will unpair, leaving out the ones picked. */
export function unpairedNames(
  lists: PlanList[],
  plan: Extract<PostPlan, { ok: true }>,
  picked: { have: string | null; want: string | null; sale: string | null },
) {
  const pickedSlugs = [picked.have, picked.want, picked.sale];
  return plan.unlink
    .map((id) => lists.find((list) => list.id === id))
    .filter((list): list is PlanList => list !== undefined && !pickedSlugs.includes(list.slug))
    .map((list) => list.name);
}
