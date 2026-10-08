import { db } from "@repo/db";
import { conversation } from "@repo/db/schema";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";

import { publishNotify } from "../../user-socket";

export async function publishChatChanged(userIds: string[], conversationId: number) {
  await Promise.all(
    [...new Set(userIds)].map((userId) =>
      publishNotify(userId, { type: "chat_changed", conversationId }),
    ),
  );
}

const ACTIVITY_PUBLISH_LIMIT = 200;

/** Tells the partners of the user's latest conversations that what the user shows them changed. */
export async function publishActivityChanged(userId: string) {
  const rows = await db
    .select({ id: conversation.id, userLow: conversation.userLow, userHigh: conversation.userHigh })
    .from(conversation)
    .where(
      and(
        or(eq(conversation.userLow, userId), eq(conversation.userHigh, userId)),
        isNotNull(conversation.lastMessageId),
      ),
    )
    .orderBy(desc(conversation.lastMessageAt))
    .limit(ACTIVITY_PUBLISH_LIMIT);
  await Promise.all(
    rows.map((row) =>
      publishChatChanged([row.userLow === userId ? row.userHigh : row.userLow], row.id),
    ),
  );
}
