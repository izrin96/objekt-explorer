import { intlCached } from "@/lib/intl-cache";
import { getLocale } from "@/paraglide/runtime";

const months = new Map<string, Intl.DateTimeFormat>();

/** `since` is `YYYY-MM`; read in UTC, so the server and the browser print the same month. */
export function sinceLabel(since: string) {
  const [year, month] = since.split("-").map(Number);
  if (!year || !month) return since;
  const locale = getLocale();
  return intlCached(
    months,
    locale,
    () => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }),
  ).format(new Date(Date.UTC(year, month - 1)));
}
