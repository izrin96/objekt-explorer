import type { Outputs } from "@repo/api";

import { m } from "@/paraglide/messages";

type StackAsk = Pick<Outputs["trade"]["sideItems"]["items"][number], "price" | "qyop">;

/**
 * A sale stack's price caption in the list's currency: one price, the lowest and highest when its
 * priced copies differ, QYOP when none is priced and one is QYOP, else "No price", muted.
 */
export function stackPriceText(ask: StackAsk, format: (amount: number) => string) {
  if (ask.price) {
    const { min, max } = ask.price;
    return { text: min === max ? format(min) : `${format(min)}–${format(max)}`, muted: false };
  }
  if (ask.qyop) return { text: m.list_manage_objekt_set_price_qyop(), muted: false };
  return { text: m.list_price_none(), muted: true };
}
