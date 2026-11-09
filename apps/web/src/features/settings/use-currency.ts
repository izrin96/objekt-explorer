import { normalizeCurrency } from "@repo/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@/lib/orpc";
import { useSettings } from "@/stores/settings";

import { formatCurrency } from "./currency-format";

/** The rate table changes slowly and the server caches it for an hour too. */
const RATES_STALE_TIME = 1000 * 60 * 60;

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
      format: (amount: number) => formatCurrency(amount, currency),
      formatUsd: (usd: number) => formatCurrency(usd / rate, currency),
      /** null when `code` is already `currency`, or has no rate to convert through */
      formatConverted: (amount: number, code: string) => {
        const from = normalizeCurrency(code);
        if (from === currency) return null;
        const usdPerFrom = from === "USD" ? 1 : rates?.[from];
        if (usdPerFrom === undefined) return null;
        return formatCurrency((amount * usdPerFrom) / rate, currency);
      },
    }),
    [currency, rate, rates],
  );
}
