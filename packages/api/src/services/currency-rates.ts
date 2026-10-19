import { db } from "@repo/db";
import { currencyRates } from "@repo/db/schema";

import { getCache } from "./redis";

/** USD exchange rates from the database, cached for an hour; `getCache` reads the database when Redis is down. */
export async function getUsdRates(): Promise<Record<string, number>> {
  const fetchRates = async () => {
    const rows = await db
      .select({ code: currencyRates.code, rate: currencyRates.rate })
      .from(currencyRates);

    return Object.fromEntries(rows.map((r) => [r.code, r.rate]));
  };

  return getCache("currency-rates", 3600, fetchRates);
}
