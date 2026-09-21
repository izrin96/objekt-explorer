import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@/lib/orpc";
import { getLocale } from "@/paraglide/runtime";
import { useSettings } from "@/stores/settings";

/** The rate table changes slowly and the server caches it for an hour too. */
const RATES_STALE_TIME = 1000 * 60 * 60;

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(getLocale(), { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

/** Falls back to the code itself where the runtime has no display name for it. */
export function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(getLocale(), { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The market API answers in USD throughout. This converts into the viewer's
 * preferred code, and stays on USD while rates are loading or when the stored
 * code has no rate, so a price is never shown under the wrong symbol.
 */
export function useCurrency() {
  const preferred = useSettings((s) => s.currency);
  const { data: rates } = useQuery(
    orpc.market.rates.queryOptions({
      staleTime: RATES_STALE_TIME,
      refetchOnWindowFocus: false,
    }),
  );

  const usdPerUnit = preferred === "USD" ? 1 : rates?.[preferred];
  const currency = usdPerUnit === undefined ? "USD" : preferred;
  const rate = usdPerUnit ?? 1;

  return useMemo(
    () => ({
      currency,
      codes: [...new Set(["USD", ...Object.keys(rates ?? {})])].sort(),
      fromUsd: (usd: number) => usd / rate,
      toUsd: (amount: number) => amount * rate,
      /** an amount already in `currency` */
      format: (amount: number) => formatAmount(amount, currency),
      formatUsd: (usd: number) => formatAmount(usd / rate, currency),
    }),
    [currency, rate, rates],
  );
}
