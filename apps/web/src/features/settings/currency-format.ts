import { normalizeCurrency } from "@repo/lib/currency";

import { intlCached } from "@/lib/intl-cache";
import { getLocale } from "@/paraglide/runtime";

/** keyed by locale and currency; a code the runtime rejects is never stored */
const currencyFormats = new Map<string, Intl.NumberFormat>();

/** An amount in the currency it was set in — a seller's own price, not the viewer's. */
export function formatCurrency(amount: number, code: string): string {
  const currency = normalizeCurrency(code);
  const locale = getLocale();
  const key = `${locale}|${currency}`;
  try {
    let formatter = currencyFormats.get(key);
    if (formatter === undefined) {
      formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
      currencyFormats.set(key, formatter);
    }
    return formatter.format(amount);
  } catch {
    return `${amount.toLocaleString(getLocale())} ${currency}`;
  }
}

const currencyNames = new Map<string, Intl.DisplayNames>();

/** Falls back to the code itself where the runtime has no display name for it. */
export function currencyName(code: string): string {
  try {
    const locale = getLocale();
    const names = intlCached(
      currencyNames,
      locale,
      () => new Intl.DisplayNames(locale, { type: "currency" }),
    );
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}
