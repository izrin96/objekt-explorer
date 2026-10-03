/**
 * Codes sellers type that are not ISO 4217, mapped to the code they mean.
 * Real codes typed by mistake (KPW for KRW, TND for NTD) stay as typed.
 */
export const CURRENCY_ALIASES: Record<string, string> = {
  NTD: "TWD",
  NTW: "TWD",
  TPE: "TWD",
  RMB: "CNY",
  WON: "KRW",
  JPN: "JPY",
  YEN: "JPY",
};

export function normalizeCurrency(code: string): string {
  const upper = code.toUpperCase();
  return CURRENCY_ALIASES[upper] ?? upper;
}
