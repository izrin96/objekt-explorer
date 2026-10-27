import {
  CHAT_BOXES,
  type ChatBox,
  INBOX_SHOWS,
  type InboxShow,
  SEARCH_MAX_LENGTH,
} from "@repo/api/schemas/chat";
import * as z from "zod";

/** Inbox is the default and stays out of the URL. */
export const messagesSearchSchema = z.object({
  box: z.enum(CHAT_BOXES).optional().catch(undefined),
  q: z.string().trim().min(1).max(SEARCH_MAX_LENGTH).optional().catch(undefined),
  show: z.enum(INBOX_SHOWS).optional().catch(undefined),
});

export const boxOf = (search: { box?: ChatBox }): ChatBox => search.box ?? "inbox";

/** The Inbox's chip; the other folders show every conversation, whatever the URL says. */
export const showOf = (search: { box?: ChatBox; show?: InboxShow }): InboxShow =>
  boxOf(search) === "inbox" ? (search.show ?? "all") : "all";
