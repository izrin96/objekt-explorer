import { db } from "@repo/db";
import { currencyRates } from "@repo/db/schema";
import { ofetch } from "ofetch";

import { log } from "../lib/log";
import { redis } from "../lib/redis";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates?base=USD";
const ratesLog = log("rates");

interface FrankfurterItem {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export async function updateCurrencyRates() {
  ratesLog.debug("Fetching from Frankfurter");

  let data: FrankfurterItem[];
  try {
    data = await ofetch<FrankfurterItem[]>(FRANKFURTER_URL, { timeout: 10_000 });
  } catch (err) {
    ratesLog.warn("Fetch failed; retrying at the next run:", err);
    return;
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    for (const { quote, rate } of data) {
      // Frankfurter returns "1 USD = X quote units". We store "1 quote unit = X USD".
      const usdPerUnit = quote === "USD" ? 1 : 1 / rate;

      await tx
        .insert(currencyRates)
        .values({ code: quote, rate: usdPerUnit, updatedAt: now })
        .onConflictDoUpdate({
          target: currencyRates.code,
          set: { rate: usdPerUnit, updatedAt: now },
        });
    }
  });

  // Invalidate Redis cache so the server picks up fresh rates immediately.
  await redis.del("currency-rates");

  ratesLog.info("Updated:", data.length, "currencies");
}
