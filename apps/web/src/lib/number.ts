import { intlCached } from "@/lib/intl-cache";
import { getLocale } from "@/paraglide/runtime";

const countFormats = new Map<string, Intl.NumberFormat>();

/** A count in the reader's digits and grouping, as `value.toLocaleString(locale)` writes it. */
export function formatCount(value: number, locale: string = getLocale()) {
  return intlCached(countFormats, locale, () => new Intl.NumberFormat(locale)).format(value);
}
