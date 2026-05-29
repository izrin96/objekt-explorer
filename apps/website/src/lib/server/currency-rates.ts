import { db } from "@repo/db";
import { currencyRates } from "@repo/db/schema";

import { getCache } from "./redis.server";

/**
 * Fetch USD exchange rates from the database, cached in Redis for 1 hour.
 * Falls back to direct DB query if Redis is unavailable.
 */
export async function getUsdRates(): Promise<Record<string, number>> {
  const fetchRates = async () => {
    const rows = await db
      .select({ code: currencyRates.code, rate: currencyRates.rate })
      .from(currencyRates);

    return Object.fromEntries(rows.map((r) => [r.code, r.rate]));
  };

  try {
    return await getCache("currency-rates", 3600, fetchRates);
  } catch {
    console.warn("[rates] Redis unavailable, falling back to direct DB query");
    return fetchRates();
  }
}
