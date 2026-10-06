import { CHAT_BOXES } from "@repo/api/schemas/chat";
import * as z from "zod";

/** Inbox is the default and stays out of the URL. */
export const messagesSearchSchema = z.object({
  box: z.enum(CHAT_BOXES).optional().catch(undefined),
});
