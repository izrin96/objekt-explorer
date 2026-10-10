import { publishBatch, publishUsers } from "@repo/api/realtime";
import { notifyChannel, type UserSocketMessage } from "@repo/api/schemas/notification";
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
  const changed = JSON.stringify({ type: "notifications_changed" } satisfies UserSocketMessage);
  const sends: Promise<unknown>[] = [];
  const reputations = unique(publishes.flatMap((p) => p.reputations ?? []));
  if (reputations.length > 0) sends.push(redis.send("DEL", reputations.map(reputationKey)));
  const notified = unique(publishes.flatMap((p) => p.notified));
  for (const userId of notified) {
    sends.push(redis.publish(notifyChannel(userId), changed));
  }
  sends.push(publishUsers(notified, { type: "notifications_changed" }));
  const seen = new Set<string>();
  const chats: { userId: string; event: UserSocketMessage }[] = [];
  for (const { id, userIds } of publishes.flatMap((p) => p.conversations)) {
    for (const userId of userIds) {
      if (seen.has(`${id}:${userId}`)) continue;
      seen.add(`${id}:${userId}`);
      const message = { type: "chat_changed", conversationId: id } satisfies UserSocketMessage;
      chats.push({ userId, event: message });
      sends.push(redis.publish(notifyChannel(userId), JSON.stringify(message)));
    }
  }
  sends.push(publishBatch(chats));
  await Promise.all(sends);
}
