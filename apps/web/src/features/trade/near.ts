import type { NearVerb, SideNear } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export type { NearVerb, SideNear };

/** What the objekt drawer needs to say why a near match isn't counted, and to fix it. */
export type NearOpen = {
  verb: NearVerb;
  /** their list's role: a want list's near match is the viewer's copy, any other the viewer's want */
  role: "have" | "want" | "sale";
  theirList: string;
  /** the viewer's lists holding it */
  myListIds: readonly number[];
  /** the person, once the row adds it */
  person?: string;
  /** opens the offer builder on the row's post with this objekt added, where the row offers one */
  makeOffer?: () => void;
};

/** Opens an objekt from a strip or a dialog, with its near match when it is one. */
export type OpenObjekt = (objekt: ValidObjekt, near?: NearOpen) => void;

const COUNT: Record<NearVerb, (input: { count: string }) => string> = {
  sell: m.trade_near_count_sell,
  swap: m.trade_near_count_swap,
  buy: m.trade_near_count_buy,
};

const RING_TEXT: Record<NearVerb, () => string> = {
  sell: m.trade_near_ring_sell,
  swap: m.trade_near_ring_swap,
  buy: m.trade_near_ring_buy,
};

const STACK_TEXT: Record<NearVerb, (input: { count: string }) => string> = {
  sell: m.trade_stack_copies_near_sell,
  swap: m.trade_stack_copies_near_swap,
  buy: m.trade_stack_copies_near_buy,
};

/** "1 more if you sell" */
export const nearCountText = (verb: NearVerb, count: number) =>
  COUNT[verb]({ count: count.toLocaleString(getLocale()) });

/** A near match's accessible description, one copy or a stack. */
export const nearRingText = (verb: NearVerb, qty: number) =>
  qty > 1 ? STACK_TEXT[verb]({ count: qty.toLocaleString(getLocale()) }) : RING_TEXT[verb]();
