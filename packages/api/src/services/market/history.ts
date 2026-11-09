import { db } from "@repo/db";
import { collectionPriceHistory } from "@repo/db/schema";
import { and, asc, eq, gte, sql } from "drizzle-orm";

import type { PriceHistoryOutput } from "../../schemas/market";
import {
  historyCacheSeconds,
  rangeStart,
  type PriceHistoryRange,
} from "../../schemas/price-history";
import { getCache } from "../redis";

const EMPTY_HISTORY_TTL = 60;

async function fetchPriceHistory(
  collectionSlug: string,
  range: PriceHistoryRange,
  now: Date,
): Promise<PriceHistoryOutput> {
  const start = rangeStart(range, now);
  const slugIs = eq(collectionPriceHistory.collectionSlug, collectionSlug);

  const [points, [tracking]] = await Promise.all([
    db
      .select({
        date: collectionPriceHistory.date,
        floorUsd: collectionPriceHistory.floorUsd,
        medianUsd: collectionPriceHistory.medianUsd,
        listingCount: collectionPriceHistory.listingCount,
      })
      .from(collectionPriceHistory)
      .where(start ? and(slugIs, gte(collectionPriceHistory.date, start)) : slugIs)
      .orderBy(asc(collectionPriceHistory.date)),
    db
      .select({
        since: sql<string | null>`min(${collectionPriceHistory.date})`,
        snapshots: sql<number>`count(*)::int`,
      })
      .from(collectionPriceHistory)
      .where(slugIs),
  ]);

  return {
    points,
    tracking: tracking?.since ? { since: tracking.since, snapshots: tracking.snapshots } : null,
  };
}

export async function getPriceHistory(collectionSlug: string, range: PriceHistoryRange) {
  const now = new Date();
  const load = () => fetchPriceHistory(collectionSlug, range, now);
  try {
    // nothing recorded yet (or an unknown slug) is kept briefly, so a made-up slug holds a key
    // for a minute at most while a real collection picks up its first snapshot soon
    return await getCache(
      `market:history:${collectionSlug}:${range}`,
      (history) => (history.tracking === null ? EMPTY_HISTORY_TTL : historyCacheSeconds(now)),
      load,
    );
  } catch {
    console.warn("[market] Redis unavailable, falling back to direct DB query");
    return load();
  }
}
