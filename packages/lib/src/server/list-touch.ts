import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { inArray, sql } from "drizzle-orm";

type Counter = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
};

export const tradeVersionKey = (userId: string) => `trade:foryou:v:${userId}`;

// far past the matches cache's 5 minutes, so a version that lapses never meets its old entries
const VERSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function bumpTradeVersion(redis: Counter, userIds: Iterable<string>) {
  await Promise.all(
    [...new Set(userIds)].map(async (userId) => {
      const key = tradeVersionKey(userId);
      await redis.incr(key);
      await redis.expire(key, VERSION_TTL_SECONDS);
    }),
  );
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
