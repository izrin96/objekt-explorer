import type { ListTypeNew } from "@repo/api/schemas/list";

import { m } from "@/paraglide/messages";

type Suggestion = () => string;

const FOR_CARD: Partial<Record<ListTypeNew, Suggestion>> = {
  sale: m.chat_suggest_sale,
  have: m.chat_suggest_have,
  want: m.chat_suggest_want,
};

const GENERAL: Suggestion[] = [m.chat_suggest_open, m.chat_suggest_hi];

/**
 * The first-line suggestions for an empty conversation: one for the attached card's list when
 * it came from the other person's list, then the general ones.
 */
export function firstLineSuggestions(listType: ListTypeNew | undefined): Suggestion[] {
  const forCard = listType ? FOR_CARD[listType] : undefined;
  return forCard ? [forCard, ...GENERAL] : GENERAL;
}
