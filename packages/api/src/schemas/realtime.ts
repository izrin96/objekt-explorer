import type { ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { chatMessageSchema, conversationRowSchema } from "./chat";

/** Centrifugo's disconnect code for a revoked session; 4500–4999 tells the client not to reconnect. */
export const SESSION_REVOKED_CODE = 4501;
export const SESSION_REVOKED_REASON = "session_revoked";

export const ACTIVITY_CHANNEL = "activity:feed";
/** The `#` makes the channel the user's alone: only a connection of that user may subscribe to it. */
export const userChannel = (userId: string) => `user:#${userId}`;

/** What reaches a user's tabs; the server builds each from the viewer's own point of view. */
export const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notifications_changed") }),
  z.object({ type: z.literal("chat_changed"), conversationId: z.number().int() }),
  z.object({ type: z.literal("chat_typing"), conversationId: z.number().int() }),
  z.object({
    type: z.literal("chat_unsent"),
    conversationId: z.number().int(),
    messageId: z.number().int(),
  }),
  z.object({
    type: z.literal("chat_message"),
    conversationId: z.number().int(),
    message: chatMessageSchema,
    /** the conversation's message before this one; a tab appends only when it holds that as its newest */
    previousMessageId: z.number().int().nullable(),
    /** the thread endpoint's `collections` for this message, so a card draws without a request */
    collections: z.custom<Record<string, ValidObjekt>>(),
    /** the viewer's inbox row, as the list endpoint returns it */
    conversation: conversationRowSchema,
    /** the viewer's badge counts after this message */
    unread: z.number().int(),
    requests: z.number().int(),
  }),
]);
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
