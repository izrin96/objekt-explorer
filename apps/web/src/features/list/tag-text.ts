import type { PostTag } from "@repo/api/schemas/trade-post";

import { m } from "@/paraglide/messages";

export const TAG_LABEL: Record<PostTag, { short: () => string; long: () => string }> = {
  wtt: { short: m.trade_tag_wtt, long: m.trade_tag_wtt_desc },
  wtb: { short: m.trade_tag_wtb, long: m.trade_tag_wtb_desc },
  wts: { short: m.trade_tag_wts, long: m.trade_tag_wts_desc },
};

/** A tag in plain text, for a menu option: "WTT · Want to trade". */
export function tagText(tag: PostTag) {
  return `${TAG_LABEL[tag].short()} · ${TAG_LABEL[tag].long()}`;
}
