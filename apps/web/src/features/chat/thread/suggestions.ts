import type { ListTypeNew } from "@repo/api/schemas/list";

import type { Attachment } from "@/features/chat/attachment";
import { m } from "@/paraglide/messages";

type Suggestion = () => string;

const FOR_CARD: Partial<Record<ListTypeNew, Suggestion>> = {
  sale: m.chat_suggest_sale,
  have: m.chat_suggest_have,
  want: m.chat_suggest_want,
};

const GENERAL: Suggestion[] = [m.chat_suggest_open, m.chat_suggest_hi];

/**
 * The first-line suggestions for an empty conversation: one for the attached card, then the
 * general ones. An objekt card from the other person's list asks about that objekt; a post card
 * never does, since it names no objekt, and asks about a swap, or about the match it carries.
 */
export function firstLineSuggestions(attachment: Attachment | null | undefined): Suggestion[] {
  if (attachment?.kind === "post") {
    return [attachment.view.match ? m.chat_suggest_match : m.chat_suggest_post, ...GENERAL];
  }
  const forCard = attachment?.listType ? FOR_CARD[attachment.listType] : undefined;
  return forCard ? [forCard, ...GENERAL] : GENERAL;
}
