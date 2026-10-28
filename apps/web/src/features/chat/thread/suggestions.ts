import type { ListType } from "@repo/api/schemas/list";

import type { Attachment, PostAttachment } from "@/features/chat/attachment";
import { m } from "@/paraglide/messages";

type Suggestion = () => string;

const FOR_CARD: Partial<Record<ListType, Suggestion>> = {
  sale: m.chat_suggest_sale,
  have: m.chat_suggest_have,
  want: m.chat_suggest_want,
};

const GENERAL: Suggestion[] = [m.chat_suggest_open, m.chat_suggest_hi];

/**
 * A post card names no objekt, so its line follows the post's type and the match it carries, read
 * from the sender's side: the owner's objekts are the ones the sender wants.
 */
function forPost({ view }: PostAttachment): Suggestion {
  const tag = view.post?.tag;
  if (tag === "wts") return m.chat_suggest_sale;
  const theyHave = view.match?.ownerHas.count ?? 0;
  const youHave = view.match?.senderHas.count ?? 0;
  if (tag === "wtb") {
    if (youHave === 0) return m.chat_suggest_wtb;
    return youHave === 1 ? m.chat_suggest_you_have_one : m.chat_suggest_you_have_some;
  }
  // a card saved before `canSwap` existed reads as one the two could swap with
  if (theyHave > 0 && youHave > 0 && view.match?.canSwap !== false) return m.chat_suggest_match;
  if (theyHave > 0 && theyHave >= youHave) {
    return theyHave === 1 ? m.chat_suggest_they_have_one : m.chat_suggest_they_have_some;
  }
  if (youHave > 0)
    return youHave === 1 ? m.chat_suggest_you_have_one : m.chat_suggest_you_have_some;
  return m.chat_suggest_post;
}

/**
 * The first-line suggestions for an empty conversation: one for the attached card, then the
 * general ones. An objekt card from the other person's list asks about that objekt.
 */
export function firstLineSuggestions(attachment: Attachment | null | undefined): Suggestion[] {
  if (attachment?.kind === "post") return [forPost(attachment), ...GENERAL];
  const forCard = attachment?.listType ? FOR_CARD[attachment.listType] : undefined;
  return forCard ? [forCard, ...GENERAL] : GENERAL;
}
