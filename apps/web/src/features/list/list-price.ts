import type { ListObjekt } from "@repo/lib/types/objekt";

import { formatCurrency } from "@/features/settings/use-currency";
import { m } from "@/paraglide/messages";

/** the list's own currency, not the viewer's; an unpriced card nudges the owner to set one */
export function formatPrice(currency: string, objekt: ListObjekt, canPrice: boolean): string {
  if (objekt.isQyop) return m.list_manage_objekt_set_price_qyop();
  if (objekt.price === null) return canPrice ? m.objekt_set_price() : m.list_price_none();
  return formatCurrency(objekt.price, currency);
}

export function formatConvertedPrice(
  currency: string,
  objekt: ListObjekt,
  formatConverted: (amount: number, from: string) => string | null,
): string | undefined {
  if (objekt.isQyop || objekt.price === null) return undefined;
  return formatConverted(objekt.price, currency) ?? undefined;
}
