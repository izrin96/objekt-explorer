import { utcDate } from "@repo/api/schemas/price-history";
import { fetchPriceSnapshot } from "@repo/api/services/market-aggregate";
import { db } from "@repo/db";
import { collectionPriceHistory, currencyRates } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

// 6 parameters a row, far below Postgres's 65,535
const CHUNK = 1000;

// not getUsdRates: services/currency-rates loads the web app's serverEnv through services/redis
async function readUsdRates(): Promise<Record<string, number>> {
  const rows = await db
    .select({ code: currencyRates.code, rate: currencyRates.rate })
    .from(currencyRates);
  return Object.fromEntries(rows.map((r) => [r.code, r.rate]));
}

export async function snapshotPriceHistory(rates?: Record<string, number>) {
  const usdRates = rates ?? (await readUsdRates());
  if (Object.keys(usdRates).length === 0) {
    console.warn("[price-history] No currency rates, skipping snapshot");
    return;
  }

  const date = utcDate(new Date());

  await db.transaction(async (tx) => {
    const snapshot = await fetchPriceSnapshot(tx, usdRates);

    for (let i = 0; i < snapshot.length; i += CHUNK) {
      await tx
        .insert(collectionPriceHistory)
        .values(
          snapshot.slice(i, i + CHUNK).map((row) => ({
            collectionSlug: row.slug,
            date,
            floorUsd: row.floorUsd,
            medianUsd: row.medianUsd,
            listingCount: row.listingCount,
            pricedCount: row.pricedCount,
          })),
        )
        .onConflictDoUpdate({
          target: [collectionPriceHistory.collectionSlug, collectionPriceHistory.date],
          set: {
            floorUsd: sql`excluded.floor_usd`,
            medianUsd: sql`excluded.median_usd`,
            listingCount: sql`excluded.listing_count`,
            pricedCount: sql`excluded.priced_count`,
          },
          setWhere: sql`(${collectionPriceHistory.floorUsd}, ${collectionPriceHistory.medianUsd}, ${collectionPriceHistory.listingCount}, ${collectionPriceHistory.pricedCount}) IS DISTINCT FROM (excluded.floor_usd, excluded.median_usd, excluded.listing_count, excluded.priced_count)`,
        });
    }

    const slugs = snapshot.map((row) => row.slug);
    await tx
      .delete(collectionPriceHistory)
      .where(
        and(
          eq(collectionPriceHistory.date, date),
          sql`${collectionPriceHistory.collectionSlug} <> ALL(${sql.param(slugs)}::varchar[])`,
        ),
      );
  });

  console.log("[price-history] Snapshot", date);
}
