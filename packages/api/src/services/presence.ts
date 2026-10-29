import { db } from "@repo/db";
import { user } from "@repo/db/schema";
import { inArray, sql } from "drizzle-orm";

import {
  ACTIVE_MARK_SECONDS,
  activeKey,
  idleFrom,
  onlineFromReplies,
  presenceStatsRequest,
  presenceTargets,
} from "../lib/presence";
import { query } from "../realtime";
import { redis, redisFailOpen } from "./redis";
import { notBlockedEither } from "./safety";

/**
 * Of `userIds`, those online whose dot the viewer may see, and which of them are idle; nobody
 * online when presence can't be read, nobody idle when activity can't.
 */
export async function onlineAmong(
  viewerId: string,
  userIds: string[],
): Promise<{ online: string[]; idle: string[] }> {
  if (userIds.every((id) => id === viewerId)) return { online: [], idle: [] };

  const rows = await db
    .select({
      id: user.id,
      shows: user.showOnline,
      blocked: sql<boolean>`NOT ${notBlockedEither(viewerId, sql`${user.id}`)}`,
    })
    .from(user)
    .where(inArray(user.id, userIds));
  const shown = presenceTargets(viewerId, userIds, rows);
  if (shown.length === 0) return { online: [], idle: [] };

  const reply = await query(presenceStatsRequest(shown));
  const online = reply === null ? [] : onlineFromReplies(shown, reply);
  if (online.length === 0) return { online: [], idle: [] };

  const marks = await redisFailOpen(
    "presence",
    async () => (await redis.send("MGET", online.map(activeKey))) as (string | null)[],
  );
  return { online, idle: idleFrom(online, marks, Date.now()) };
}

/** Records that the person is active in some tab now. */
export async function markActive(userId: string) {
  await redisFailOpen("presence", () =>
    redis.set(activeKey(userId), String(Date.now()), "EX", ACTIVE_MARK_SECONDS),
  );
}
