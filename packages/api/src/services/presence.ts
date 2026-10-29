import { db } from "@repo/db";
import { user } from "@repo/db/schema";
import { inArray, sql } from "drizzle-orm";

import { onlineFromReplies, presenceStatsRequest, presenceTargets } from "../lib/presence";
import { query } from "../realtime";
import { notBlockedEither } from "./safety";

/** Of `userIds`, those online whose dot the viewer may see; nobody when presence can't be read. */
export async function onlineAmong(viewerId: string, userIds: string[]): Promise<string[]> {
  if (userIds.every((id) => id === viewerId)) return [];

  const rows = await db
    .select({
      id: user.id,
      shows: user.showOnline,
      blocked: sql<boolean>`NOT ${notBlockedEither(viewerId, sql`${user.id}`)}`,
    })
    .from(user)
    .where(inArray(user.id, [viewerId, ...userIds]));
  const shown = presenceTargets(viewerId, userIds, rows);
  if (shown.length === 0) return [];

  const reply = await query(presenceStatsRequest(shown));
  return reply === null ? [] : onlineFromReplies(shown, reply);
}
