import type { ListType } from "@repo/api/schemas/list";
import type { OpenTo } from "@repo/api/schemas/open-to";

import { type Tone } from "@/lib/tone";
import { m } from "@/paraglide/messages";

export const LIST_TYPE_LABEL: Record<ListType, () => string> = {
  general: m.list_type_general,
  sale: m.list_type_sale,
  have: m.list_type_have,
  want: m.list_type_want,
};

export const LIST_TYPE_TONE: Record<ListType, Tone> = {
  general: "neutral",
  have: "have",
  want: "want",
  sale: "sale",
};

export const OPEN_TO_LABEL: Record<OpenTo, () => string> = {
  swaps: m.list_create_match_swaps_label,
  both: m.list_create_match_both_label,
  buying: m.list_create_match_buying_label,
};
