import { publishBatch } from "../../realtime";
import type { RealtimeEvent } from "../../schemas/realtime";
import { toChatMessages } from "./cards";
import { loadConversationRow, requestConversationCount, unreadConversationCount } from "./inbox";

type SentRow = Parameters<typeof toChatMessages>[0][number];
type Viewed = Awaited<ReturnType<typeof toChatMessages>>;

/**
 * One `chat_message` per member, each as that member's endpoints would return it, so a tab shows
 * it with no request. `known` holds views already built. A member whose inbox lists nothing
 * for the conversation gets `chat_changed`, which refetches what they can see.
 */
export async function buildChatMessages(
  conversationId: number,
  previousMessageId: number | null,
  row: SentRow,
  memberIds: string[],
  known: Record<string, Viewed> = {},
) {
  return Promise.all(
    memberIds.map(async (userId) => {
      const [viewed, loaded, unread, requests] = await Promise.all([
        known[userId] ?? toChatMessages([row], userId),
        loadConversationRow(userId, conversationId),
        unreadConversationCount(userId),
        requestConversationCount(userId),
      ]);
      const message = viewed.messages[0];
      const event: RealtimeEvent =
        loaded && message
          ? {
              type: "chat_message",
              conversationId,
              message,
              previousMessageId,
              collections: { ...viewed.collections, ...loaded.collections },
              conversation: loaded.row,
              unread,
              requests,
            }
          : { type: "chat_changed", conversationId };
      return { userId, event };
    }),
  );
}

/** A failure here only costs the tabs a refetch, never the send that already committed. */
export async function publishChatMessage(
  conversationId: number,
  previousMessageId: number | null,
  row: SentRow,
  memberIds: string[],
  known: Record<string, Viewed> = {},
) {
  try {
    await publishBatch(
      await buildChatMessages(conversationId, previousMessageId, row, memberIds, known),
    );
  } catch (error) {
    console.error(
      "[Realtime] Failed to build chat messages:",
      error instanceof Error ? error.message : String(error),
    );
    await publishBatch(
      memberIds.map((userId) => ({
        userId,
        event: { type: "chat_changed", conversationId } satisfies RealtimeEvent,
      })),
    );
  }
}
