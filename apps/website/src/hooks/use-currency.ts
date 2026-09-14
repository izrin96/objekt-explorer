import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc } from "@/lib/orpc/client";
import { formatPrice } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";

import { useConfigStore } from "./use-config";

/** "Malaysian Ringgit" in the UI language; falls back to the code itself */
export function currencyName(code: string) {
  try {
    return new Intl.DisplayNames(getLocale(), { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Converts the USD amounts the market API returns into the user's preferred
 * currency. Stays in USD until rates load or when the preferred code has no rate.
 */
export type Currency = ReturnType<typeof useCurrency>;

export function useCurrency() {
  const preferred = useConfigStore((s) => s.currency);
  const { data: rates } = useQuery(
    orpc.market.rates.queryOptions({
      staleTime: 1000 * 60 * 60,
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
      formatUsd: (usd: number) => formatPrice(usd / rate, currency),
    }),
    [currency, rate, rates],
  );
}
