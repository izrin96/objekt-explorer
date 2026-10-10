import { publishBatch, publishUsers } from "@repo/api/realtime";
import type { RealtimeEvent } from "@repo/api/schemas/realtime";
import { reputationKey } from "@repo/api/schemas/reputation";

import { unique } from "./array";
import { redis } from "./redis";

/** What a committed transaction announces; nothing here runs before the commit. */
export type Publish = {
  notified: string[];
  conversations: { id: number; userIds: string[] }[];
  /** users whose cached reputation a completed or failed trade changed */
  reputations?: string[];
};

export async function publishAll(publishes: Publish[]) {
  const sends: Promise<unknown>[] = [];
  // cache invalidation, not a nudge: the reputation line reads again on its next request
  const reputations = unique(publishes.flatMap((p) => p.reputations ?? []));
  if (reputations.length > 0) sends.push(redis.send("DEL", reputations.map(reputationKey)));
  sends.push(
    publishUsers(unique(publishes.flatMap((p) => p.notified)), { type: "notifications_changed" }),
  );
  const seen = new Set<string>();
  const chats: { userId: string; event: RealtimeEvent }[] = [];
  for (const { id, userIds } of publishes.flatMap((p) => p.conversations)) {
    for (const userId of userIds) {
      if (seen.has(`${id}:${userId}`)) continue;
      seen.add(`${id}:${userId}`);
      chats.push({ userId, event: { type: "chat_changed", conversationId: id } });
    }
  }
  sends.push(publishBatch(chats));
  await Promise.all(sends);
}
