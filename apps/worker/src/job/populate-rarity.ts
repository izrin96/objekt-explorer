import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, count, eq, gt, lte } from "drizzle-orm";

import {
  BASE_MARGIN_MS,
  mergeRarity,
  needsFullCount,
  readBase,
  type RarityBase,
} from "@/lib/rarity-counts";
import { redis } from "@/lib/redis";

const RARITY_KEY = "collection-rarity";
const BASE_KEY = "collection-rarity:base";

// a full count reads the whole objekt table (about 2 GB); counts only grow with mints, so it
// runs once a day and every other run adds the objekts minted since its cutoff
export async function populateRarity() {
  const nowMs = Date.now();
  const stored = readBase(await redis.get(BASE_KEY));
  const base = stored && !needsFullCount(stored, nowMs) ? stored : await fullCount(nowMs);

  const recent = await indexer
    .select({ slug: collections.slug, count: count() })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(gt(objekts.mintedAt, base.at))
    .groupBy(collections.slug);

  // refreshed hourly; the long expiry keeps the web off its own full count while this job is down,
  // and a day-old count still sorts by rarity correctly
  await redis.set(
    RARITY_KEY,
    JSON.stringify(mergeRarity(base.counts, recent)),
    "EX",
    2 * 24 * 60 * 60,
  );
}

async function fullCount(nowMs: number): Promise<RarityBase> {
  const at = new Date(nowMs - BASE_MARGIN_MS).toISOString();
  const counts = await indexer
    .select({ slug: collections.slug, count: count(objekts.id) })
    .from(collections)
    .leftJoin(objekts, and(eq(objekts.collectionId, collections.id), lte(objekts.mintedAt, at)))
    .groupBy(collections.slug);
  const base = { at, counts };
  // outlives the daily recount, so a stopped worker never leaves an old base behind for good
  await redis.set(BASE_KEY, JSON.stringify(base), "EX", 2 * 24 * 60 * 60);
  return base;
}
