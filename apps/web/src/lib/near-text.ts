import type { NearVerb } from "@repo/api/schemas/trade";

import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

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
  COUNT[verb]({ count: formatCount(count) });

/** A near match's accessible description, one copy or a stack. */
export const nearRingText = (verb: NearVerb, qty: number) =>
  qty > 1 ? STACK_TEXT[verb]({ count: formatCount(qty) }) : RING_TEXT[verb]();
