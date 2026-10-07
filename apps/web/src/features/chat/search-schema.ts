import { CHAT_BOXES, type ChatBox } from "@repo/api/schemas/chat";
import * as z from "zod";

/** Inbox is the default and stays out of the URL. */
export const messagesSearchSchema = z.object({
  box: z.enum(CHAT_BOXES).optional().catch(undefined),
});

export const boxOf = (search: { box?: ChatBox }): ChatBox => search.box ?? "inbox";
