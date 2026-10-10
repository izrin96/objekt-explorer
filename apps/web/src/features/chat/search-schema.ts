import { CHAT_BOXES, type ChatBox, SEARCH_MAX_LENGTH } from "@repo/api/schemas/chat";
import * as z from "zod";

/** Inbox is the default and stays out of the URL. */
export const messagesSearchSchema = z.object({
  box: z.enum(CHAT_BOXES).optional().catch(undefined),
  q: z.string().trim().min(1).max(SEARCH_MAX_LENGTH).optional().catch(undefined),
});

export const boxOf = (search: { box?: ChatBox }): ChatBox => search.box ?? "inbox";
