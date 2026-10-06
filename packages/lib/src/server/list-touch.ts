import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { inArray, sql } from "drizzle-orm";

type Counter = { incr(key: string): Promise<number> };

export const tradeVersionKey = (userId: string) => `trade:foryou:v:${userId}`;

export async function bumpTradeVersion(redis: Counter, userIds: Iterable<string>) {
  await Promise.all([...new Set(userIds)].map((userId) => redis.incr(tradeVersionKey(userId))));
}

/**
 * Marks the lists changed and drops their owners' cached trade matches. Call it after
 * the write commits: bumped any earlier, a read in between caches the old rows under
 * the new version.
 */
export async function touchListWith(redis: Counter, listIds: number[]) {
  const ids = [...new Set(listIds)];
  if (ids.length === 0) return;

  const rows = await db
    .update(lists)
    .set({ updatedAt: sql`now()` })
    .where(inArray(lists.id, ids))
    .returning({ userId: lists.userId });

  await bumpTradeVersion(
    redis,
    rows.map((row) => row.userId),
  );
}
